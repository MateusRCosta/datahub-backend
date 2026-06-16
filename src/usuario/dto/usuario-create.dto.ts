import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  Matches,
} from 'class-validator';
import { IsTextField } from 'src/common/decorators/is-text-field-value.decorator';
import { Permissao } from '../interfaces/permissao';

export class UsuarioCreateDto {
  @IsNotEmpty()
  @IsTextField(120, 'Joao Silva')
  readonly nome!: string;

  @IsEmail()
  @IsTextField(120, 'joao@example.com')
  readonly email!: string;

  @IsTextField(255, 'password123', 8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9]).+$/, {
    message:
      'A senha deve ter no minimo 8 caracteres, uma letra maiuscula, uma letra minuscula e um caractere especial',
  })
  readonly senha!: string;

  @IsBoolean()
  readonly admin!: boolean;

  @IsArray()
  @IsEnum(Permissao, { each: true })
  readonly permissoes!: Permissao[];
}
