import { Type } from 'class-transformer';
import {
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { getIntegracaoCampanhaConfigType } from './integracao-campanha-config.dto';
import {
  PROVEDOR_INTEGRACAO_CAMPANHA,
  type IntegracaoCampanhaConfigDto,
} from '../types/provedor-integracao-campanha.type';

export class IntegracaoCampanhaUpdateDto {
  @MaxLength(120)
  @IsString()
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
