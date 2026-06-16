import { IsBoolean, IsEnum, IsNotEmpty, IsOptional } from 'class-validator';
import { TipoCampo } from '../util/type';
import { IsNameField } from 'src/common/decorators/is-name-field-value.decorator';

export class BaseDadosEstruturaDto {
  @IsNameField(100, 'idade')
  @IsOptional()
  rotulo?: string | null;

  @IsNameField(100, 'age')
  cabecalho!: string;

  @IsEnum(TipoCampo)
  @IsOptional()
  tipo?: TipoCampo;

  @IsBoolean()
  @IsNotEmpty()
  obrigatorio!: boolean;
}
