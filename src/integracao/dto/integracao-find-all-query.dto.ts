import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';

export class IntegracaoFindAllQueryDto extends PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  readonly id?: number;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  readonly nome?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  readonly usuarioId?: number;
}
