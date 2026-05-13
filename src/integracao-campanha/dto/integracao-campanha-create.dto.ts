import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { getIntegracaoCampanhaConfigType } from './integracao-campanha-config.dto';
import type { IntegracaoCampanhaConfigDto } from './integracao-campanha-config.dto';
import { ProvedorIntegracaoCampanha } from '../types/provedor-integracao-campanha.type';

export class IntegracaoCampanhaCreateDto {
  @MaxLength(100)
  @IsString()
  readonly nome!: string;

  @IsOptional()
  @IsBoolean()
  readonly status?: boolean;

  @IsEnum(ProvedorIntegracaoCampanha)
  readonly provedor!: ProvedorIntegracaoCampanha;

  @IsObject()
  @ValidateNested()
  @Type(getIntegracaoCampanhaConfigType)
  readonly config!: IntegracaoCampanhaConfigDto;
}
