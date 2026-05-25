import { TipoCampo } from 'src/base-dados/util/type';
import {
  IsNotEmpty,
  IsString,
  MaxLength,
  IsOptional,
  ValidateNested,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { IntegracaoVariavelIncrementoDto } from './integracao-variavel-incremento-dto';
import { ValidateIncrementoCondicional } from 'src/common/decorators/validate-incremento-condicional.decorator';

export class IntegracaoVariavelDto {
  @IsString()
  @MaxLength(100)
  @IsNotEmpty()
  readonly nome!: string;

  @IsString()
  @MaxLength(256)
  @IsNotEmpty()
  readonly valor!: string;

  @IsNotEmpty()
  @IsEnum(TipoCampo)
  readonly tipo!: TipoCampo;

  @IsOptional()
  @ValidateNested()
  @Type(() => IntegracaoVariavelIncrementoDto)
  @ValidateIncrementoCondicional()
  readonly incremento?: IntegracaoVariavelIncrementoDto | null;
}
