import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { IsStrongPassword } from 'src/common/decorators/is-strong-password.decorator';
import { Permissao } from '../interfaces/permissao';

export class UsuarioUpdateDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  readonly nome?: string;

  @IsOptional()
  @IsString()
  @IsStrongPassword()
  readonly senha?: string;

  @IsOptional()
  @IsBoolean()
  readonly admin?: boolean;

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(Permissao, { each: true })
  readonly permissoes?: Permissao[];
}
