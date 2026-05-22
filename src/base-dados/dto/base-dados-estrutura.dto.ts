import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { TipoCampo } from '../util/type';

export class BaseDadosEstruturaDto {
  @IsOptional()
  @MaxLength(100)
  @IsString()
  @IsNotEmpty()
  rotulo?: string | null;

  @IsString()
  @MaxLength(100)
  @IsNotEmpty()
  cabecalho!: string;

  @IsOptional()
  tipo?: TipoCampo;

  @IsBoolean()
  @IsNotEmpty()
  obrigatorio!: boolean;
}
