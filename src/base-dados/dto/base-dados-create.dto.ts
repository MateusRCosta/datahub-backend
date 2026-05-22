import { IsString, MaxLength, ValidateNested } from 'class-validator';
import { BaseDadosEstruturaDto } from './base-dados-estrutura.dto';
import { Type } from 'class-transformer';

export class BaseDadosCreateDto {
  @MaxLength(120)
  @IsString()
  nome!: string;

  @ValidateNested()
  @Type(() => BaseDadosEstruturaDto)
  estrutura!: BaseDadosEstruturaDto[];
}
