import { IsEmail, IsNotEmpty } from 'class-validator';
import { IsTextField } from 'src/common/decorators/is-text-field-value.decorator';

export class LoginDto {
  @IsEmail()
  @IsTextField(255, 'user@example.com')
  readonly email!: string;

  @IsTextField(255, 'password123')
  @IsNotEmpty()
  readonly senha!: string;
}
