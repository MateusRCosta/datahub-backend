import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { getTemplateConfigDtoType } from './template-config.dto';
import type { Config } from '../types/template.types';
import { PROVEDOR_INTEGRACAO_CAMPANHA } from 'src/integracao-campanha/types/provedor-integracao-campanha.type';

export class UpdateTemplateDto {
  @Type(() => Number)
  @IsInt()
  readonly integracaoCampanhaId!: number;

  @IsString()
  @MaxLength(100)
  @IsOptional()
  readonly nome!: string;

  @IsEnum(PROVEDOR_INTEGRACAO_CAMPANHA)
  @IsOptional()
  readonly provedor!: PROVEDOR_INTEGRACAO_CAMPANHA;

  @IsObject()
  @ValidateNested()
  @Type(getTemplateConfigDtoType)
  @IsOptional()
  readonly config!: Config;
}
