import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  MaxLength,
} from 'class-validator';
import { IsStrongPassword } from 'src/common/decorators/is-strong-password.decorator';
import { Permissao } from '../interfaces/permissao';

export class UsuarioCreateDto {
  @IsNotEmpty()
  @MaxLength(120)
  readonly nome!: string;

  @IsEmail()
  @MaxLength(120)
  readonly email!: string;

  @IsStrongPassword()
  readonly senha!: string;

  @IsBoolean()
  readonly admin!: boolean;

  @IsArray()
  @IsEnum(Permissao, { each: true })
  readonly permissoes!: Permissao[];
}
