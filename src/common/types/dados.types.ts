export type Campo = {
  campo: string;
  rotulo?: string | null;
};

export enum TipoCampo {
  TEXTO = 'TEXTO',
  NUMERO = 'NUMERO',
  BOOLEANO = 'BOOLEANO',
  UTC = 'UTC',
  MM_DD_YYYY = 'MM_DD_YYYY',
  DD_MM_YYYY = 'DD_MM_YYYY',
  YYYY_MM_DD = 'YYYY_MM_DD',
  EMAIL = 'EMAIL',
  TELEFONE = 'TELEFONE',
}

export type TipoData =
  | TipoCampo.UTC
  | TipoCampo.MM_DD_YYYY
  | TipoCampo.DD_MM_YYYY
  | TipoCampo.YYYY_MM_DD;
