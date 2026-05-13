import {
  DisparoProConfigDto,
  EmailConfigDto,
  UpchatConfigDto,
} from '../dto/integracao-campanha-config.dto';

export enum ProvedorIntegracaoCampanha {
  UPCHAT = 'UPCHAT',
  EMAIL = 'EMAIL',
  DISPARO_PRO = 'DISPARO_PRO',
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
  provedor?: ProvedorIntegracaoCampanha;
}
