import { IsBoolean, IsEnum, IsNotEmpty, IsOptional } from 'class-validator';
import { TipoCampo } from '../util/type';
import { IsTextField } from 'src/common/decorators/is-text-field-value.decorator';

export class BaseDadosEstruturaDto {
  @IsTextField(100, 'idade')
  @IsOptional()
  rotulo?: string | null;

  @IsTextField(100, 'age')
  cabecalho!: string;

  @IsEnum(TipoCampo)
  @IsOptional()
  tipo?: TipoCampo;

  @IsBoolean()
  @IsNotEmpty()
  obrigatorio!: boolean;
}
