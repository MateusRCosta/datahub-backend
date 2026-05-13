import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';

export class ClienteFindAllQueryDto extends PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  readonly id?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  readonly baseDeDadosId?: number;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  readonly hash?: string;
}
