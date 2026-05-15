import { EstruturaBaseDadosDto } from 'src/base-dados/dto/bases-dados-estrutura.dto';
import { TipoCampo } from 'src/base-dados/util/type';

export type CampoValidacao = {
  nome: string;
  vazio: boolean;
  validado: boolean;
  erros: CampoValidacaoErro[];
};

export type DadosNormalizado = {
  dados: Record<string, unknown>;
  validacao: CampoValidacao[];
};

export type CampoValidacaoErro = {
  field: string;
  code: string;
  message: string;
};

type ParseResult =
  | {
      ok: true;
      value: unknown;
    }
  | {
      ok: false;
      code: string;
      message: string;
      value: unknown;
    };

function removeAccents(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function normalizeBoolean(value: string): boolean | null {
  const normalized = removeAccents(value.trim().toLowerCase());

  if (['true', 'sim', 'yes', '1'].includes(normalized)) return true;
  if (['false', 'nao', 'no', '0'].includes(normalized)) return false;

  return null;
}

function stringifyRawValue(value: unknown): string {
  if (value === undefined || value === null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === 'bigint') {
    return value.toString();
  }

  return JSON.stringify(value);
}

function parseText(rawValue: string): ParseResult {
  return { ok: true, value: rawValue.trim() };
}

function parseNumber(rawValue: string): ParseResult {
  const value = rawValue.trim();

  if (!/^[-+]?\d+([.,]\d+)?$/.test(value)) {
    return {
      ok: false,
      code: 'INVALID_NUMBER',
      message: 'Valor numerico invalido',
      value,
    };
  }

  return { ok: true, value: Number(value.replace(',', '.')) };
}

function parseBoolean(rawValue: string): ParseResult {
  const value = rawValue.trim();
  const parsed = normalizeBoolean(value);

  if (parsed === null) {
    return {
      ok: false,
      code: 'INVALID_BOOLEAN',
      message: 'Valor booleano invalido',
      value,
    };
  }

  return { ok: true, value: parsed };
}

function parseString(rawValue: string): ParseResult {
  return { ok: true, value: rawValue.trim() };
}

function isValidDateParts(year: number, month: number, day: number): boolean {
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function parseDateParts(value: string, type: TipoCampo): boolean {
  if (type === TipoCampo.UTC) {
    return !Number.isNaN(Date.parse(value));
  }

  const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return false;

  const first = Number(match[1]);
  const second = Number(match[2]);
  const year = Number(match[3]);
  const month = type === TipoCampo.MM_DD_YYYY ? first : second;
  const day = type === TipoCampo.MM_DD_YYYY ? second : first;

  return isValidDateParts(year, month, day);
}

function parseDate(rawValue: string, type: TipoCampo): ParseResult {
  const value = rawValue.trim();

  if (!parseDateParts(value, type)) {
    return {
      ok: false,
      code: 'INVALID_DATE',
      message: 'Data invalida',
      value,
    };
  }

  return { ok: true, value };
}

function parseByType(
  tipo: TipoCampo | undefined,
  rawValue: string,
): ParseResult {
  const tipoNormalizado = tipo ?? TipoCampo.TEXTO;

  switch (tipoNormalizado) {
    case TipoCampo.TEXTO:
      return parseText(rawValue);
    case TipoCampo.NUMERO:
      return parseNumber(rawValue);
    case TipoCampo.BOOLEANO:
      return parseBoolean(rawValue);
    case TipoCampo.EMAIL:
      return parseString(rawValue);
    case TipoCampo.TELEFONE:
      return parseString(rawValue);
    case TipoCampo.UTC:
    case TipoCampo.MM_DD_YYYY:
    case TipoCampo.DD_MM_YYYY:
      return parseDate(rawValue, tipoNormalizado);
    default:
      return parseText(rawValue);
  }
}

function validateByType(
  tipo: TipoCampo | undefined,
  field: string,
  value: unknown,
): CampoValidacaoErro[] {
  const tipoNormalizado = tipo ?? TipoCampo.TEXTO;

  switch (tipoNormalizado) {
    case TipoCampo.EMAIL:
      return typeof value === 'string' && isEmail(value)
        ? []
        : [
            {
              field,
              code: 'INVALID_EMAIL',
              message: 'Email invalido',
            },
          ];
    case TipoCampo.TELEFONE:
      return typeof value === 'string' && /^\d+$/.test(value)
        ? []
        : [
            {
              field,
              code: 'INVALID_PHONE',
              message: 'Telefone invalido',
            },
          ];
    default:
      return [];
  }
}

function validateRequired(
  field: string,
  value: unknown,
  obrigatorio: boolean,
): CampoValidacaoErro[] {
  if (!obrigatorio) return [];

  const vazio = value === undefined || value === null || value === '';

  if (!vazio) return [];

  return [
    {
      field,
      code: 'REQUIRED',
      message: 'Campo obrigatorio',
    },
  ];
}

function isEmptyValue(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (typeof value === 'string') return value.trim() === '';
  return false;
}

function normalizeParsedValue(
  tipo: TipoCampo | undefined,
  value: unknown,
): unknown {
  if (
    (tipo ?? TipoCampo.TEXTO) === TipoCampo.EMAIL &&
    typeof value === 'string'
  ) {
    return value.toLowerCase();
  }

  return value;
}

export function normalizaDadosCliente(
  row: Record<string, unknown>,
  estrutura: EstruturaBaseDadosDto[],
): DadosNormalizado {
  const dados: Record<string, unknown> = {};
  const validacao: CampoValidacao[] = [];

  for (const campo of estrutura) {
    const chaveCabecalho = campo.cabecalho.trim();
    const nomeCampo = chaveCabecalho;
    const chaveRotulo = campo.rotulo?.trim();
    const raw =
      row[chaveCabecalho] ??
      (chaveRotulo && chaveRotulo.length > 0 ? row[chaveRotulo] : undefined);
    const vazio = isEmptyValue(raw);

    if (vazio) {
      dados[nomeCampo] = null;
      const erros = validateRequired(nomeCampo, null, campo.obrigatorio);
      validacao.push({
        nome: nomeCampo,
        vazio: true,
        validado: erros.length === 0,
        erros,
      });
      continue;
    }

    const rawValue = stringifyRawValue(raw);
    const parsed = parseByType(campo.tipo, rawValue);

    if (!parsed.ok) {
      dados[nomeCampo] = parsed.value;
      validacao.push({
        nome: nomeCampo,
        vazio: false,
        validado: false,
        erros: [
          {
            field: nomeCampo,
            code: parsed.code,
            message: parsed.message,
          },
        ],
      });
      continue;
    }

    const normalizado = normalizeParsedValue(campo.tipo, parsed.value);
    const erros = validateByType(campo.tipo, nomeCampo, normalizado);

    dados[nomeCampo] = normalizado;
    validacao.push({
      nome: nomeCampo,
      vazio: false,
      validado: erros.length === 0,
      erros,
    });
  }

  return { dados, validacao };
}
