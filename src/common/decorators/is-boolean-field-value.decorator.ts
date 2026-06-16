import { applyDecorators } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean } from 'class-validator';

export function IsBooleanField(example = true): PropertyDecorator {
  return applyDecorators(
    ApiProperty({
      type: 'boolean',
      example,
    }),
    Transform(({ value }: { value: unknown }) =>
      value === 'true' || value === '1'
        ? true
        : value === 'false' || value === '0'
          ? false
          : value,
    ),
    IsBoolean(),
  );
}
