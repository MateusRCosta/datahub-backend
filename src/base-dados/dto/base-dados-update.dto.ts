import { Type } from 'class-transformer';
import {
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { BaseDadosEstruturaDto } from './base-dados-estrutura.dto';

export class BaseDadosUpdateDto {
  @IsOptional()
  @MaxLength(120)
  @IsString()
  nome?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BaseDadosEstruturaDto)
  estrutura?: BaseDadosEstruturaDto[];
}
