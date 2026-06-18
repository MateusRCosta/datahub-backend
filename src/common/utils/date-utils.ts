import { TipoCampo, TipoData } from '../types/dados.types';

type SeparadorData = '/' | '-';

function extraiFormatoData(
  value: string,
  formato: TipoData,
): {
  formato: TipoData | null;
  partes: [number, number, number] | null;
  separador: SeparadorData | null;
} {
  const texto = value.trim();

  const utc = texto.match(/^(\d{4})([/-])(\d{2})([/-])(\d{2})$/);
  if (utc) {
    return {
      formato,
      partes: [Number(utc[3]), Number(utc[2]), Number(utc[1])],
      separador: utc[2] as SeparadorData,
    };
  }

  const local = texto.match(/^(\d{2})([/-])(\d{2})\2(\d{4})$/);
  if (local) {
    const primeiro = Number(local[1]);
    const segundo = Number(local[3]);
    const ano = Number(local[4]);
    const separador = local[2] as SeparadorData;

    if (formato === TipoCampo.DD_MM_YYYY) {
      return {
        formato: TipoCampo.DD_MM_YYYY,
        partes: [primeiro, segundo, ano],
        separador,
      };
    }

    if (formato === TipoCampo.MM_DD_YYYY) {
      return {
        formato: TipoCampo.MM_DD_YYYY,
        partes: [segundo, primeiro, ano],
        separador,
      };
    }

    if (primeiro > 12) {
      return {
        formato: TipoCampo.DD_MM_YYYY,
        partes: [primeiro, segundo, ano],
        separador,
      };
    }

    if (segundo > 12) {
      return {
        formato: TipoCampo.MM_DD_YYYY,
        partes: [segundo, primeiro, ano],
        separador,
      };
    }

    return {
      formato: TipoCampo.DD_MM_YYYY,
      partes: [primeiro, segundo, ano],
      separador,
    };
  }

  return { formato: null, partes: null, separador: null };
}

function criaDataUTC(dia: number, mes: number, ano: number) {
  const date = new Date(Date.UTC(ano, mes - 1, dia));

  if (
    date.getUTCFullYear() !== ano ||
    date.getUTCMonth() !== mes - 1 ||
    date.getUTCDate() !== dia
  ) {
    return null;
  }

  return date;
}

function formataData(
  date: Date,
  formato: TipoData,
  separador: SeparadorData = '/',
) {
  const dia = String(date.getUTCDate()).padStart(2, '0');
  const mes = String(date.getUTCMonth() + 1).padStart(2, '0');
  const ano = String(date.getUTCFullYear());

  if (formato === TipoCampo.MM_DD_YYYY) {
    return `${mes}${separador}${dia}${separador}${ano}`;
  }

  if (formato === TipoCampo.YYYY_MM_DD) {
    return `${ano}${separador}${mes}${separador}${dia}`;
  }

  if (formato === TipoCampo.UTC) {
    return `${ano}-${mes}-${dia}`;
  }

  return `${dia}${separador}${mes}${separador}${ano}`;
}

export function incrementaData(value: string, formato: TipoData): string {
  const extraido = extraiFormatoData(value, formato);
  if (!extraido.formato || !extraido.partes) return value;

  const [dia, mes, ano] = extraido.partes;
  const date = criaDataUTC(dia, mes, ano);
  if (!date) return value;

  date.setUTCDate(date.getUTCDate() + 1);
  return formataData(date, extraido.formato, extraido.separador ?? '/');
}

export function hojeUTC(): Date {
  const agora = new Date();
  return new Date(
    Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth(), agora.getUTCDate()),
  );
}

export function dataDDMMYYYYMaiorQueHoje(
  value: string,
  formato: TipoData,
): boolean {
  const extraido = extraiFormatoData(value, formato);
  if (!extraido.formato || !extraido.partes) return false;

  const [dia, mes, ano] = extraido.partes;
  const date = criaDataUTC(dia, mes, ano);
  if (!date) return false;

  return date.getTime() > hojeUTC().getTime();
}
