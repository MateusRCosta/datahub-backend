import { applyDecorators } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Max } from 'class-validator';

export function IsIdValid() {
  return applyDecorators(
    ApiProperty({
      type: 'number',
      example: 1023,
      maximum: 1000000,
    }),
    Type(() => Number),
    IsInt(),
    Max(1000000),
  );
}
