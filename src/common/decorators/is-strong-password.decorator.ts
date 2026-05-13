import { applyDecorators } from '@nestjs/common';
import {
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export function IsStrongPassword() {
  return applyDecorators(
    IsNotEmpty(),
    IsString(),
    MinLength(8),
    MaxLength(255),
    Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9]).+$/, {
      message:
        'A senha deve ter no minimo 8 caracteres, uma letra maiuscula, uma letra minuscula e um caractere especial',
    }),
  );
}
