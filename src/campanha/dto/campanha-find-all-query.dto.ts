import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { STATUS_CAMPANHA } from '../types/campanha.type';

export class CampanhaFindAllQueryDto extends PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  readonly id?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  readonly nome?: string;

  @IsOptional()
  @IsEnum(STATUS_CAMPANHA)
  readonly status?: STATUS_CAMPANHA;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  readonly templateId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  readonly viewId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  readonly baseDeDadoId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  readonly usuarioId?: number;
}
