import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength } from 'class-validator';
export class BasesDadosFindAllQueryDto extends PaginationQueryDto {
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

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  readonly integracaoId?: number;
}
