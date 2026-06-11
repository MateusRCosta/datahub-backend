import { IsEnum } from 'class-validator';
import { STATUS_CAMPANHA } from '../types/campanha.type';
import { ApiProperty } from '@nestjs/swagger';

export class CampanhaAlteraStatusDto {
  @ApiProperty({
    type: 'string',
    enum: STATUS_CAMPANHA,
    example: 'cancelado',
  })
  @IsEnum(STATUS_CAMPANHA)
  readonly status!: STATUS_CAMPANHA;
}
