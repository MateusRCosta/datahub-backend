import { IsEnum, IsOptional } from 'class-validator';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { STATUS_CLIENTE_CAMPANHA } from '../types/cliente-campanha.type';
import { ApiProperty } from '@nestjs/swagger';
import { IsIdValid } from 'src/common/decorators/is-id-value.decorator';

export class CampanhaClientesQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsIdValid()
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
