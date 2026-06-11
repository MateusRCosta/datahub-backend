import { applyDecorators } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

export function IsNameField(maxLength: number, example: string) {
  return applyDecorators(
    ApiProperty({
      type: 'string',
      example: example,
      maxLength: maxLength,
    }),
    IsString(),
    MaxLength(maxLength),
  );
}
