import {
  IsNotEmpty,
  IsOptional,
  ValidateNested,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { IntegracaoVariavelIncrementoDto } from './integracao-variavel-incremento-dto';
import { ValidateIncrementoCondicional } from 'src/common/decorators/validate-incremento-condicional.decorator';
import { IsTextField } from 'src/common/decorators/is-text-field-value.decorator';
import { TipoCampo } from 'src/common/types/dados.types';

export class IntegracaoVariavelDto {
  @IsTextField(100, 'id')
  @IsNotEmpty()
  readonly nome!: string;

  @IsTextField(256, 'id')
  @IsNotEmpty()
  readonly valor!: string;

  @IsEnum(TipoCampo)
  @IsNotEmpty()
  readonly tipo!: TipoCampo;

  @IsOptional()
  @ValidateNested()
  @Type(() => IntegracaoVariavelIncrementoDto)
  @ValidateIncrementoCondicional()
  readonly incremento?: IntegracaoVariavelIncrementoDto | null;
}
