import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { ProvedorIntegracaoCampanha } from '../types/provedor-integracao-campanha.type';

export class IntegracaoCampanhaFindAllQueryDto extends PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  readonly id?: number;

  @MaxLength(120)
  @IsString()
  readonly nome!: string;

  @IsOptional()
  @IsEnum(ProvedorIntegracaoCampanha)
  readonly provedor?: ProvedorIntegracaoCampanha;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  readonly status?: boolean;
}
