import { Type } from 'class-transformer';
import {
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { ViewQueryDto } from './view-query.dto';

export class ViewUpdateDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  readonly nome?: string;

  @IsString()
  @MaxLength(256)
  @IsOptional()
  readonly descricao?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => ViewQueryDto)
  readonly query?: ViewQueryDto;
}
