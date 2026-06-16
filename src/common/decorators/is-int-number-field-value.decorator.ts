import { applyDecorators } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

export function IsIntNumberField(
  max: number,
  example: number,
  min?: number,
): PropertyDecorator {
  const decorators: PropertyDecorator[] = [
    ApiProperty({
      type: 'number',
      example: example,
      maximum: max,
      ...(min !== undefined ? { minimum: min } : {}),
    }),
    Type(() => Number),
    IsInt(),
    Max(max),
  ];

  if (min !== undefined) {
    decorators.push(Min(min));
  }

  return applyDecorators(...decorators);
}
