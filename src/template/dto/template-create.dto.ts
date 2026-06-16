import { IsEnum, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { getTemplateConfigDtoType } from './template-config.dto';
import type { Config } from '../types/template.types';
import { PROVEDOR_INTEGRACAO_CAMPANHA } from 'src/integracao-campanha/types/provedor-integracao-campanha.type';
import { IsIdValid } from 'src/common/decorators/is-id-value.decorator';
import { IsIntNumberField } from 'src/common/decorators/is-int-number-field-value.decorator';
import { IsTextField } from 'src/common/decorators/is-text-field-value.decorator';

export class CreateTemplateDto {
  @IsTextField(100, 'Template upchat')
  readonly nome!: string;

  @IsIdValid()
  readonly integracaoCampanhaId!: number;

  @IsEnum(PROVEDOR_INTEGRACAO_CAMPANHA)
  readonly provedor!: PROVEDOR_INTEGRACAO_CAMPANHA;

  @IsObject()
  @ValidateNested()
  @Type(getTemplateConfigDtoType)
  readonly config!: Config;

  @IsIntNumberField(1024, 0, 0)
  readonly quantidadeVars!: number;
}
