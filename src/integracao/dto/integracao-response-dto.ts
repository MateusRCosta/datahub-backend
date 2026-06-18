import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { TipoCampo } from 'src/common/types/dados.types';
import { IsTextField } from 'src/common/decorators/is-text-field-value.decorator';

export class IntegracaoResponseDto {
  @IsTextField(100, 'id')
  readonly nome!: string;

  @IsTextField(100, '[n].id')
  readonly path!: string;

  @IsEnum(TipoCampo)
  readonly tipo!: TipoCampo;

  @IsBoolean()
  @IsOptional()
  readonly array!: boolean;

  @IsBoolean()
  @IsOptional()
  readonly identificador!: boolean;
}
