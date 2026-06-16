import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  Matches,
} from 'class-validator';
import { IsTextField } from 'src/common/decorators/is-text-field-value.decorator';
import { Permissao } from '../interfaces/permissao';

export class UsuarioUpdateDto {
  @IsOptional()
  @IsTextField(120, 'Joao Silva')
  readonly nome?: string;

  @IsOptional()
  @IsTextField(255, 'password123', 8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9]).+$/, {
    message:
      'A senha deve ter no minimo 8 caracteres, uma letra maiuscula, uma letra minuscula e um caractere especial',
  })
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
