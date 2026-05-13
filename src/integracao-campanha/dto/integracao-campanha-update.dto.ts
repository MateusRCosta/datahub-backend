import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { getIntegracaoCampanhaConfigType } from './integracao-campanha-config.dto';
import type { IntegracaoCampanhaConfigDto } from './integracao-campanha-config.dto';
import { ProvedorIntegracaoCampanha } from '../types/provedor-integracao-campanha.type';

export class IntegracaoCampanhaUpdateDto {
  @MaxLength(120)
  @IsString()
  @IsOptional()
  readonly nome!: string;

  @IsOptional()
  @IsBoolean()
  readonly status?: boolean;

  @ValidateIf((dto: IntegracaoCampanhaUpdateDto) => {
    return dto.config !== undefined || dto.provedor !== undefined;
  })
  @IsEnum(ProvedorIntegracaoCampanha)
  readonly provedor?: ProvedorIntegracaoCampanha;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(getIntegracaoCampanhaConfigType)
  readonly config?: IntegracaoCampanhaConfigDto;
}
