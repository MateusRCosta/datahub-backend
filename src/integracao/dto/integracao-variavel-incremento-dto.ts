import { IsBoolean, IsNumber, IsOptional } from 'class-validator';

export class IntegracaoVariavelIncrementoDto {
  @IsOptional()
  @IsBoolean()
  readonly incrementa: boolean | null = null;

  @IsOptional()
  @IsNumber()
  readonly limiteIncrementa: number | null = null;

  @IsOptional()
  @IsBoolean()
  readonly limiteDataAtual: boolean | null = null;

  @IsOptional()
  @IsBoolean()
  readonly delimitador: boolean | null = null;
}
