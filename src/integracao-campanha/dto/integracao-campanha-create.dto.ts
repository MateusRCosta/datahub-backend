import { Type } from 'class-transformer';
import { IsEnum, IsObject, ValidateNested } from 'class-validator';
import { IsTextField } from 'src/common/decorators/is-text-field-value.decorator';
import { getIntegracaoCampanhaConfigType } from './integracao-campanha-config.dto';
import {
  PROVEDOR_INTEGRACAO_CAMPANHA,
  type IntegracaoCampanhaConfigDto,
} from '../types/provedor-integracao-campanha.type';

export class IntegracaoCampanhaCreateDto {
  @IsTextField(100, 'Upchat')
  readonly nome!: string;

  @IsEnum(PROVEDOR_INTEGRACAO_CAMPANHA)
  readonly provedor!: PROVEDOR_INTEGRACAO_CAMPANHA;

  @IsObject()
  @ValidateNested()
  @Type(getIntegracaoCampanhaConfigType)
  readonly config!: IntegracaoCampanhaConfigDto;
}
