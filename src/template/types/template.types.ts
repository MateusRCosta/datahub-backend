import { PROVEDOR } from 'src/integracao-campanha/types/execucao.type';

export enum TIPO_BOTOES {
  FLOW = 'flow',
  QUICK_REPLY = 'quickReply',
  PHONE_NUMBER = 'phoneNumber',
  URL = 'url',
}

export type Config = UpchatConfigTemplate;

export type UpchatConfigTemplate = {
  provedor: PROVEDOR.UPCHAT;
  id: number;
  nome: string;
  tituloTemplate: string;
  mensagemTemplate: string;
  rodapeTemplate: string;
  botoes: Botoes[];
};

export type Botoes = BotaoFlow | BotaoQuickReply | BotaoUrl | BotaoPhoneNumber;
interface BotaoBase {
  textoBotao: string;
}
export interface BotaoFlow extends BotaoBase {
  flowId: string;
}

export type BotaoQuickReply = BotaoBase;

export interface BotaoUrl extends BotaoBase {
  url: string;
}

export interface BotaoPhoneNumber extends BotaoBase {
  numeroTelefone: string;
}
