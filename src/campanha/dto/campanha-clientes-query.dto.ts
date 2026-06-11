import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max } from 'class-validator';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { STATUS_CLIENTE_CAMPANHA } from '../types/cliente-campanha.type';
import { ApiProperty } from '@nestjs/swagger';

export class CampanhaClientesQueryDto extends PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Max(1000000)
  readonly clienteId?: number;

  @ApiProperty({
    type: 'string',
    enum: STATUS_CLIENTE_CAMPANHA,
    example: 'pendente',
  })
  @IsOptional()
  @IsEnum(STATUS_CLIENTE_CAMPANHA)
  readonly status?: STATUS_CLIENTE_CAMPANHA;
}
