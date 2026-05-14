import { TypeHelpOptions } from 'class-transformer';
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

export type BotaoDtoType =
  | typeof BotaoFlowDto
  | typeof BotaoUrlDto
  | typeof BotaoPhoneNumberDto
  | typeof BotaoQuickReplyDto
  | typeof Object;

export interface BotaoComTipo {
  tipo?: BOTAO_ENUM;
}
export function getBotaoDtoType(typeOptions?: TypeHelpOptions): BotaoDtoType {
  const dto = typeOptions?.object as BotaoComTipo | undefined;

  switch (dto?.tipo) {
    case BOTAO_ENUM.FLOW:
      return BotaoFlowDto;

    case BOTAO_ENUM.QUICK_REPLY:
      return BotaoQuickReplyDto;

    case BOTAO_ENUM.PHONE_NUMBER:
      return BotaoPhoneNumberDto;

    case BOTAO_ENUM.URL:
      return BotaoUrlDto;

    default:
      return BotaoQuickReplyDto;
  }
}
