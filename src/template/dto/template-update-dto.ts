import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { getTemplateConfigDtoType } from './template-config.dto';
import type { Config } from '../types/template.types';
import { PROVEDOR_INTEGRACAO_CAMPANHA } from 'src/integracao-campanha/types/provedor-integracao-campanha.type';

export class UpdateTemplateDto {
  @IsString()
  @MaxLength(100)
  @IsOptional()
  readonly nome!: string;

  @IsEnum(PROVEDOR_INTEGRACAO_CAMPANHA)
  @IsOptional()
  readonly provedor!: PROVEDOR_INTEGRACAO_CAMPANHA;

  @IsNumber()
  @Max(1024)
  readonly quantidadeVars!: number;

  @IsObject()
  @ValidateNested()
  @Type(getTemplateConfigDtoType)
  @IsOptional()
  readonly config!: Config;
}
