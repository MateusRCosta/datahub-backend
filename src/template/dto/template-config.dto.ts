import type { TypeHelpOptions } from 'class-transformer';
import { UpchatConfigDto } from './template-upchat-config.dto';
import type { TemplateComProvedor } from '../types/template-upchat.types';
import { PROVEDOR_INTEGRACAO_CAMPANHA } from 'src/integracao-campanha/types/provedor-integracao-campanha.type';

export type TemplateConfigDto = UpchatConfigDto;

export type TemplateConfigDtoType = typeof UpchatConfigDto | typeof Object;

export function getTemplateConfigDtoType(
  typeOptions?: TypeHelpOptions,
): TemplateConfigDtoType {
  const dto = typeOptions?.object as TemplateComProvedor | undefined;

  switch (dto?.provedor) {
    case PROVEDOR_INTEGRACAO_CAMPANHA.UPCHAT:
      return UpchatConfigDto;

    default:
      return Object;
  }
}
