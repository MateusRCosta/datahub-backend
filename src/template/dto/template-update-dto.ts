import { Type } from 'class-transformer';
import { IsEnum, IsObject, IsOptional, ValidateNested } from 'class-validator';
import { getTemplateConfigDtoType } from './template-config.dto';
import type { Config } from '../types/template.types';
import { PROVEDOR_INTEGRACAO_CAMPANHA } from 'src/integracao-campanha/types/provedor-integracao-campanha.type';
import { IsIntNumberField } from 'src/common/decorators/is-int-number-field-value.decorator';
import { IsTextField } from 'src/common/decorators/is-text-field-value.decorator';

export class UpdateTemplateDto {
  @IsTextField(100, 'Template upchat')
  @IsOptional()
  readonly nome!: string;

  @IsEnum(PROVEDOR_INTEGRACAO_CAMPANHA)
  @IsOptional()
  readonly provedor!: PROVEDOR_INTEGRACAO_CAMPANHA;

  @IsIntNumberField(1024, 0, 0)
  readonly quantidadeVars!: number;

  @IsObject()
  @ValidateNested()
  @Type(getTemplateConfigDtoType)
  @IsOptional()
  readonly config!: Config;
}
