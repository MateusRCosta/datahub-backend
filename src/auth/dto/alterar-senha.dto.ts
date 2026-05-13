import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { IsStrongPassword } from 'src/common/decorators/is-strong-password.decorator';

export class AlterarSenhaDto {
  @IsStrongPassword()
  readonly novaSenha!: string;

  @MaxLength(255)
  @IsNotEmpty()
  @IsString()
  readonly antigaSenha!: string;
}
