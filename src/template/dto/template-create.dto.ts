import {
  IsEnum,
  IsInt,
  IsNumber,
  IsObject,
  IsString,
  Max,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { getTemplateConfigDtoType } from './template-config.dto';
import type { Config } from '../types/template.types';
import { PROVEDOR_INTEGRACAO_CAMPANHA } from 'src/integracao-campanha/types/provedor-integracao-campanha.type';

export class CreateTemplateDto {
  @IsString()
  @MaxLength(100)
  readonly nome!: string;

  @Type(() => Number)
  @IsInt()
  readonly integracaoCampanhaId!: number;

  @IsEnum(PROVEDOR_INTEGRACAO_CAMPANHA)
  readonly provedor!: PROVEDOR_INTEGRACAO_CAMPANHA;

  @IsObject()
  @ValidateNested()
  @Type(getTemplateConfigDtoType)
  readonly config!: Config;

  @IsNumber()
  @Max(1024)
  readonly quantidadeVars!: number;
}
