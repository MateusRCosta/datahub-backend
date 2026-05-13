import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { Permissao } from '../interfaces/permissao';
import { Type } from 'class-transformer';

export class UsuarioFindAllQueryDto extends PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  readonly id?: number;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  readonly nome?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  readonly email?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  readonly admin?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  readonly ativo?: boolean;

  @IsOptional()
  @IsArray()
  @IsEnum(Permissao, { each: true })
  readonly permissoes?: Permissao[];
}
