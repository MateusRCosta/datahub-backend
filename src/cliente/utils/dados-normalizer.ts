import { EstruturaBaseDadosDto } from 'src/base-dados/dto/bases-dados-estrutura.dto';
import { TipoCampo } from 'src/base-dados/util/type';

export type CampoValidacao = {
  nome: string;
  vazio: boolean;
  validado: boolean;
};

export type DadosNormalizado = {
  dados: Record<string, unknown>;
  validacao: CampoValidacao[];
};

function removeAccents(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function normalizeBoolean(value: string): boolean | null {
  const normalized = removeAccents(value.trim().toLowerCase());

  if (['true', 'sim', 'yes', '1'].includes(normalized)) return true;
  if (['false', 'nao', 'no', '0'].includes(normalized)) return false;

  return null;
}

function stringifyRawValue(value: unknown): string {
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

function normalizeByType(tipo: TipoCampo | undefined, rawValue: string) {
  const value = rawValue.trim();
  const tipoNormalizado = tipo ?? TipoCampo.TEXTO;

  switch (tipoNormalizado) {
    case TipoCampo.TEXTO:
      return { validado: true, normalizado: value };
    case TipoCampo.NUMERO: {
      if (!/^[-+]?\d+(\.\d+)?$/.test(value)) {
        return { validado: false, normalizado: value };
      }

      return { validado: true, normalizado: Number(value) };
    }
    case TipoCampo.BOOLEANO: {
      const parsed = normalizeBoolean(value);
      if (parsed === null) return { validado: false, normalizado: value };
      return { validado: true, normalizado: parsed };
    }
    case TipoCampo.EMAIL:
      return { validado: isEmail(value), normalizado: value.toLowerCase() };
    case TipoCampo.TELEFONE:
      return { validado: /^\d+$/.test(value), normalizado: value };
    case TipoCampo.UTC:
    case TipoCampo.MM_DD_YYYY:
    case TipoCampo.DD_MM_YYYY:
      return { validado: true, normalizado: value };
    default:
      return { validado: true, normalizado: value };
  }
}

export function normalizaDadosCliente(
  row: Record<string, unknown>,
  estrutura: EstruturaBaseDadosDto[],
) {
  const dados: Record<string, unknown> = {};
  const validacao: CampoValidacao[] = [];

  for (const campo of estrutura) {
    const chaveCabecalho = campo.cabecalho.trim();
    const nomeCampo = campo.rotulo?.trim() || chaveCabecalho;
    const raw = row[chaveCabecalho];
    const vazio = raw === undefined || raw === null || raw === '';

    if (vazio) {
      dados[nomeCampo] = null;
      validacao.push({
        nome: nomeCampo,
        vazio: true,
        validado: false,
      });
      continue;
    }

    const rawValue = stringifyRawValue(raw);
    const { validado, normalizado } = normalizeByType(campo.tipo, rawValue);

    dados[nomeCampo] = normalizado;
    validacao.push({
      nome: nomeCampo,
      vazio: false,
      validado,
    });
  }

  return { dados, validacao };
}
