import { Type } from 'class-transformer';
import {
  IsEnum,
  IsObject,
  IsOptional,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { IsTextField } from 'src/common/decorators/is-text-field-value.decorator';
import { getIntegracaoCampanhaConfigType } from './integracao-campanha-config.dto';
import {
  PROVEDOR_INTEGRACAO_CAMPANHA,
  type IntegracaoCampanhaConfigDto,
} from '../types/provedor-integracao-campanha.type';

export class IntegracaoCampanhaUpdateDto {
  @IsTextField(120, 'Upchat')
  @IsOptional()
  readonly nome!: string;

  @ValidateIf((dto: IntegracaoCampanhaUpdateDto) => {
    return dto.config !== undefined || dto.provedor !== undefined;
  })
  @IsEnum(PROVEDOR_INTEGRACAO_CAMPANHA)
  readonly provedor?: PROVEDOR_INTEGRACAO_CAMPANHA;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(getIntegracaoCampanhaConfigType)
  readonly config?: IntegracaoCampanhaConfigDto;
}
