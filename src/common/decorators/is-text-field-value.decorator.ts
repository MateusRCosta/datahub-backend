import { applyDecorators } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export function IsTextField(
  maxLength: number,
  example: string,
  min?: number,
): PropertyDecorator {
  const decorators: PropertyDecorator[] = [
    ApiProperty({
      type: 'string',
      example: example,
      maxLength: maxLength,
      ...(min !== undefined ? { minLength: min } : {}),
    }),
    IsString(),
    MaxLength(maxLength),
  ];

  if (min !== undefined) {
    decorators.push(MinLength(min));
  }

  return applyDecorators(...decorators);
}
