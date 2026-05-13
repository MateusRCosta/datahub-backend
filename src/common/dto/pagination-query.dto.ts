import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  readonly page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  readonly limit?: number = 10;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  readonly orderBy?: string = 'createdAt';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  readonly order?: 'asc' | 'desc' = 'desc';
}
