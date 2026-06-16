import { IsBoolean, IsOptional } from 'class-validator';
import { IsIntNumberField } from 'src/common/decorators/is-int-number-field-value.decorator';

export class IntegracaoVariavelIncrementoDto {
  @IsOptional()
  @IsBoolean()
  readonly incrementa: boolean | null = null;

  @IsIntNumberField(2000, 578)
  @IsOptional()
  readonly limiteIncrementa: number | null = null;

  @IsOptional()
  @IsBoolean()
  readonly limiteDataAtual: boolean | null = null;

  @IsOptional()
  @IsBoolean()
  readonly delimitador: boolean | null = null;
}
