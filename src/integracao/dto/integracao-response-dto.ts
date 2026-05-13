import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';
import { TipoCampo } from 'src/base-dados/util/type';

export class IntegracaoResponseDto {
  @MaxLength(100)
  @IsString()
  readonly nome!: string;
  @MaxLength(100)
  @IsString()
  readonly path!: string;
  @MaxLength(20)
  @IsString()
  readonly tipo!: TipoCampo;
  @IsBoolean()
  @IsOptional()
  readonly array!: boolean;

  @IsBoolean()
  @IsOptional()
  readonly identificador!: boolean;
}
