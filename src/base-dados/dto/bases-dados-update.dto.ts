import { Type } from 'class-transformer';
import {
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { EstruturaBaseDadosDto } from './bases-dados-estrutura.dto';

export class BasesDadosUpdateDto {
  @IsOptional()
  @MaxLength(120)
  @IsString()
  nome?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EstruturaBaseDadosDto)
  estrutura?: EstruturaBaseDadosDto[];
}
