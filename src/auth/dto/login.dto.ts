import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, MaxLength } from 'class-validator';

export class LoginDto {
  @IsEmail()
  @MaxLength(255)
  @ApiProperty({
    maxLength: 255,
    example: 'user@example.com',
  })
  readonly email!: string;

  @IsNotEmpty()
  @MaxLength(255)
  @ApiProperty({
    maxLength: 255,
    example: 'password123',
  })
  readonly senha!: string;
}
