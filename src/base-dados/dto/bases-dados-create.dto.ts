import { IsString, MaxLength, ValidateNested } from 'class-validator';
import { EstruturaBaseDadosDto } from './bases-dados-estrutura.dto';
import { Type } from 'class-transformer';

export class BasesDadosCreateDto {
  @MaxLength(120)
  @IsString()
  nome!: string;

  @ValidateNested()
  @Type(() => EstruturaBaseDadosDto)
  estrutura!: EstruturaBaseDadosDto[];
}
