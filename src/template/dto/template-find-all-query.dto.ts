import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { PROVEDOR_INTEGRACAO_CAMPANHA } from 'src/integracao-campanha/types/provedor-integracao-campanha.type';

export class TemplateFindAllQueryDto extends PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  readonly id?: number;

  @IsOptional()
  @MaxLength(100)
  @IsString()
  readonly nome?: string;

  @IsOptional()
  @IsEnum(PROVEDOR_INTEGRACAO_CAMPANHA)
  readonly provedor?: PROVEDOR_INTEGRACAO_CAMPANHA;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  readonly integracaoCampanhaId?: number;
}
