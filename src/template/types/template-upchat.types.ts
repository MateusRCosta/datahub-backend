import {
  BotaoFlowDto,
  BotaoPhoneNumberDto,
  BotaoQuickReplyDto,
  BotaoUrlDto,
} from '../dto/template-upchat-config.dto';
import { PROVEDOR_INTEGRACAO_CAMPANHA } from 'src/integracao-campanha/types/provedor-integracao-campanha.type';

export enum TIPO_BOTOES {
  FLOW = 'flow',
  QUICK_REPLY = 'quickReply',
  PHONE_NUMBER = 'phoneNumber',
  URL = 'url',
}

export interface TemplateComProvedor {
  provedor?: PROVEDOR_INTEGRACAO_CAMPANHA;
}

export type UpchatConfigTemplate = {
  id: number;
  tituloTemplate: string;
  mensagemTemplate: string;
  rodapeTemplate: string;
  botoes: Botoes[];
};

export type Botoes = BotaoFlow | BotaoQuickReply | BotaoUrl | BotaoPhoneNumber;
interface BotaoBase {
  tipo: BOTAO_ENUM;
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

export enum BOTAO_ENUM {
  FLOW = 'flow',
  URL = 'url',
  QUICK_REPLY = 'quickReply',
  PHONE_NUMBER = 'phoneNumber',
}
export type BotaoDto =
  | BotaoFlowDto
  | BotaoUrlDto
  | BotaoPhoneNumberDto
  | BotaoQuickReplyDto;
