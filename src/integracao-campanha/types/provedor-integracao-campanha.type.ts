import {
  DisparoProConfigDto,
  EmailConfigDto,
  UpchatConfigDto,
} from '../dto/integracao-campanha-config.dto';

export enum PROVEDOR_INTEGRACAO_CAMPANHA {
  UPCHAT = 'upchat',
  EMAIL = 'email',
  DISPARO_PRO = 'disparoPro',
}

export type IntegracaoCampanhaConfigDto =
  | UpchatConfigDto
  | EmailConfigDto
  | DisparoProConfigDto;

export type IntegracaoCampanhaConfigType =
  | typeof UpchatConfigDto
  | typeof EmailConfigDto
  | typeof DisparoProConfigDto
  | typeof Object;

export interface IntegracaoCampanhaComProvedor {
  provedor?: PROVEDOR_INTEGRACAO_CAMPANHA;
}
