import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional } from 'class-validator';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { STATUS_CLIENTE_CAMPANHA } from '../types/cliente-campanha.type';

export class CampanhaClientesQueryDto extends PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  readonly clienteId?: number;

  @IsOptional()
  @IsEnum(STATUS_CLIENTE_CAMPANHA)
  readonly status?: STATUS_CLIENTE_CAMPANHA;
}
