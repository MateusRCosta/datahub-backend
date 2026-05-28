import { Type } from 'class-transformer';
import {
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { ViewQueryDto } from './view-query.dto';

export class ViewCreateDto {
  @IsString()
  @MaxLength(100)
  readonly nome!: string;

  @IsString()
  @MaxLength(100)
  @IsOptional()
  readonly descricao?: string;

  @ValidateNested()
  @Type(() => ViewQueryDto)
  readonly config!: ViewQueryDto;
}
