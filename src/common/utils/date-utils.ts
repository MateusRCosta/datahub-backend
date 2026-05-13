type FormatoData = 'DD_MM_YYYY' | 'MM_DD_YYYY' | 'UTC';
type SeparadorData = '/' | '-';

function normalizaFormatoEsperado(
  formato?: string | null,
): FormatoData | undefined {
  if (
    formato === 'DD_MM_YYYY' ||
    formato === 'MM_DD_YYYY' ||
    formato === 'UTC'
  ) {
    return formato;
  }

  return undefined;
}

function extraiFormatoData(
  value: string,
  formatoEsperado?: string | null,
): {
  formato: FormatoData | null;
  partes: [number, number, number] | null;
  separador: SeparadorData | null;
} {
  const texto = value.trim();
  const formatoNormalizado = normalizaFormatoEsperado(formatoEsperado);

  const utc = texto.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (utc) {
    return {
      formato: 'UTC',
      partes: [Number(utc[3]), Number(utc[2]), Number(utc[1])],
      separador: '-',
    };
  }

  const local = texto.match(/^(\d{2})([/-])(\d{2})\2(\d{4})$/);
  if (local) {
    const primeiro = Number(local[1]);
    const segundo = Number(local[3]);
    const ano = Number(local[4]);
    const separador = local[2] as SeparadorData;

    if (formatoNormalizado === 'DD_MM_YYYY') {
      return {
        formato: 'DD_MM_YYYY',
        partes: [primeiro, segundo, ano],
        separador,
      };
    }

    if (formatoNormalizado === 'MM_DD_YYYY') {
      return {
        formato: 'MM_DD_YYYY',
        partes: [segundo, primeiro, ano],
        separador,
      };
    }

    if (primeiro > 12) {
      return {
        formato: 'DD_MM_YYYY',
        partes: [primeiro, segundo, ano],
        separador,
      };
    }

    if (segundo > 12) {
      return {
        formato: 'MM_DD_YYYY',
        partes: [segundo, primeiro, ano],
        separador,
      };
    }

    return {
      formato: 'DD_MM_YYYY',
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
  formato: FormatoData,
  separador: SeparadorData = '/',
) {
  const dia = String(date.getUTCDate()).padStart(2, '0');
  const mes = String(date.getUTCMonth() + 1).padStart(2, '0');
  const ano = String(date.getUTCFullYear());

  if (formato === 'MM_DD_YYYY') {
    return `${mes}${separador}${dia}${separador}${ano}`;
  }

  if (formato === 'UTC') {
    return `${ano}-${mes}-${dia}`;
  }

  return `${dia}${separador}${mes}${separador}${ano}`;
}

export function incrementaData(
  value: string,
  formatoEsperado?: string | null,
): string {
  const extraido = extraiFormatoData(value, formatoEsperado);
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
  formatoEsperado?: string | null,
): boolean {
  const extraido = extraiFormatoData(value, formatoEsperado);
  if (!extraido.formato || !extraido.partes) return false;

  const [dia, mes, ano] = extraido.partes;
  const date = criaDataUTC(dia, mes, ano);
  if (!date) return false;

  return date.getTime() > hojeUTC().getTime();
}
