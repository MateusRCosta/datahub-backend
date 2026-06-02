import { UpchatConfigTemplate } from 'src/template/types/template-upchat.types';
import { Mensagem } from './execucao.type';
import { PROVEDOR_INTEGRACAO_CAMPANHA } from './provedor-integracao-campanha.type';

export enum STATUS_ENVIO {
  AGUARDANDO_ENVIO = 1,
  ENVIADA = 2,
  FILA_INVALIDA = 3,
  NUMERO_INVALIDO = 4,
  BOTOES_INVALIDO = 5,
  LISTA_INVALIDA = 6,
  ENVIO_CANCELADO = 7,
}

export type UpchatConfig = {
  url: string;
  queueId: number;
  apiKey: string;
};

export type UpchatExecuta = {
  provedor: PROVEDOR_INTEGRACAO_CAMPANHA.UPCHAT;
  config: UpchatConfig;
  clientes: Mensagem[];
  templateConfig: UpchatConfigTemplate;
  nomeCampanha: string;
};

export type UpchatMessagesResponse = {
  success: {
    enqueuedId: number;
  }[];
  fails: [];
  successCount: number;
  failCount: number;
};

export type UpchatStatusResponse = {
  mId: string | null;
  kId: number;
  status: number;
  srvRcvTime?: number;
  clientRcvTime?: number;
  clientReadTime?: number;
  deleted?: false;
};
