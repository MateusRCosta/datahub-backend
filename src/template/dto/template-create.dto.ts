import { IsEnum, IsString, MaxLength, ValidateNested } from 'class-validator';
import { PROVEDOR } from 'src/integracao-campanha/types/execucao.type';
import { Config } from '../types/template.types';
import { Type } from 'class-transformer';

export class CreateTemplateDto {
  @IsString()
  @MaxLength(100)
  readonly nome!: string;

  @IsEnum(PROVEDOR)
  readonly provedor!: PROVEDOR;

  @ValidateNested()
  @Type(() => TemplateConfigDto)
  readonly config: Config;
}
