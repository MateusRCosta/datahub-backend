import { Type } from 'class-transformer';
import {
  IsEnum,
  IsObject,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { getIntegracaoCampanhaConfigType } from './integracao-campanha-config.dto';
import {
  PROVEDOR_INTEGRACAO_CAMPANHA,
  type IntegracaoCampanhaConfigDto,
} from '../types/provedor-integracao-campanha.type';

export class IntegracaoCampanhaCreateDto {
  @MaxLength(100)
  @IsString()
  readonly nome!: string;

  @IsEnum(PROVEDOR_INTEGRACAO_CAMPANHA)
  readonly provedor!: PROVEDOR_INTEGRACAO_CAMPANHA;

  @IsObject()
  @ValidateNested()
  @Type(getIntegracaoCampanhaConfigType)
  readonly config!: IntegracaoCampanhaConfigDto;
}
