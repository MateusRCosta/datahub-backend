import { IsNotEmpty, Matches } from 'class-validator';
import { IsTextField } from 'src/common/decorators/is-text-field-value.decorator';

export class AlterarSenhaDto {
  @IsNotEmpty()
  @IsTextField(255, 'password123', 8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9]).+$/, {
    message:
      'A senha deve ter no minimo 8 caracteres, uma letra maiuscula, uma letra minuscula e um caractere especial',
  })
  readonly novaSenha!: string;

  @IsTextField(255, 'password123')
  @IsNotEmpty()
  readonly antigaSenha!: string;
}
