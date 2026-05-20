import { EstruturaBaseDadosDto } from 'src/base-dados/dto/bases-dados-estrutura.dto';
import { TipoCampo } from 'src/base-dados/util/type';
import {
  DadosNormalizado,
  ParseResultado,
  Validacao,
} from '../types/validacao.types';

function removeAcentos(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function ehEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function normalizaBoolean(value: string): boolean | null {
  const normalized = removeAcentos(value.trim().toLowerCase());

  if (['true', 'sim', 'yes', '1'].includes(normalized)) return true;
  if (['false', 'nao', 'no', '0'].includes(normalized)) return false;

  return null;
}

function transformaEmString(value: unknown): string {
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

function parseText(rawValue: string): ParseResultado {
  return { ok: true, value: rawValue.trim() };
}

function parseNumber(rawValue: string): ParseResultado {
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

function parseBoolean(rawValue: string): ParseResultado {
  const value = rawValue.trim();
  const parsed = normalizaBoolean(value);

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

function parseString(rawValue: string): ParseResultado {
  return { ok: true, value: rawValue.trim() };
}

function parseDate(rawValue: string, type: TipoCampo): ParseResultado {
  const value = rawValue.trim();

  if (type === TipoCampo.UTC) {
    if (Number.isNaN(Date.parse(value))) {
      return {
        ok: false,
        code: 'INVALID_DATE',
        message: 'Data invalida',
        value,
      };
    }
    return { ok: true, value };
  }

  const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) {
    return { ok: false, code: 'INVALID_DATE', message: 'Data invalida', value };
  }

  const first = Number(match[1]);
  const second = Number(match[2]);
  const year = Number(match[3]);
  const month = type === TipoCampo.MM_DD_YYYY ? first : second;
  const day = type === TipoCampo.MM_DD_YYYY ? second : first;

  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  ) {
    return { ok: false, code: 'INVALID_DATE', message: 'Data invalida', value };
  }

  return { ok: true, value };
}

function parseByType(
  tipo: TipoCampo | undefined,
  rawValue: string,
): ParseResultado {
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
): Validacao[] {
  const tipoNormalizado = tipo ?? TipoCampo.TEXTO;

  switch (tipoNormalizado) {
    case TipoCampo.EMAIL:
      return typeof value === 'string' && ehEmail(value)
        ? []
        : [
            {
              cabecalho: field,
              codigo: 'EMAIL_INVALIDO',
              mensagem: 'Email invalido',
            },
          ];
    case TipoCampo.TELEFONE:
      return typeof value === 'string' && /^\d+$/.test(value)
        ? []
        : [
            {
              cabecalho: field,
              codigo: 'TELEFONE_INVALIDO',
              mensagem: 'Telefone invalido',
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
): Validacao[] {
  if (!obrigatorio) return [];

  const vazio = value === undefined || value === null || value === '';

  if (!vazio) return [];

  return [
    {
      cabecalho: field,
      codigo: 'REQUIRED',
      mensagem: 'Campo obrigatorio',
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

function normalizaCabecalhoParaBusca(value: string): string {
  return value
    .replace(/^\uFEFF/, '')
    .trim()
    .replace(/^["']|["']$/g, '')
    .trim()
    .toLowerCase();
}

function buscaValorPorCabecalho(
  row: Record<string, unknown>,
  cabecalho: string,
): unknown {
  if (Object.prototype.hasOwnProperty.call(row, cabecalho)) {
    return row[cabecalho];
  }

  const cabecalhoNormalizado = normalizaCabecalhoParaBusca(cabecalho);
  const chaveEncontrada = Object.keys(row).find(
    (chave) => normalizaCabecalhoParaBusca(chave) === cabecalhoNormalizado,
  );

  return chaveEncontrada === undefined ? undefined : row[chaveEncontrada];
}

export function normalizaDadosCliente(
  row: Record<string, unknown>,
  estrutura: EstruturaBaseDadosDto[],
): DadosNormalizado {
  const dados: Record<string, unknown> = {};
  const validacao: Validacao[] = [];

  for (const campo of estrutura) {
    const chaveCabecalho = campo.cabecalho.trim();
    const raw = buscaValorPorCabecalho(row, chaveCabecalho);
    const vazio = isEmptyValue(raw);

    if (vazio) {
      dados[chaveCabecalho] = null;
      const erros = validateRequired(chaveCabecalho, null, campo.obrigatorio);
      validacao.push(...erros);
      continue;
    }

    const rawValue = transformaEmString(raw);
    const parsed = parseByType(campo.tipo, rawValue);

    if (!parsed.ok) {
      dados[chaveCabecalho] = parsed.value;
      validacao.push({
        cabecalho: chaveCabecalho,
        codigo: parsed.code,
        mensagem: parsed.message,
      });
      continue;
    }

    const normalizado = normalizeParsedValue(campo.tipo, parsed.value);
    const erros = validateByType(campo.tipo, chaveCabecalho, normalizado);

    dados[chaveCabecalho] = normalizado;
    validacao.push(...erros);
  }

  return { dados, validacao };
}
