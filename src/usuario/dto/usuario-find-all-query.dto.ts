import { IsArray, IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { Permissao } from '../interfaces/permissao';
import { Type } from 'class-transformer';
import { IsIdValid } from 'src/common/decorators/is-id-value.decorator';
import { IsTextField } from 'src/common/decorators/is-text-field-value.decorator';

export class UsuarioFindAllQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsIdValid()
  readonly id?: number;

  @IsOptional()
  @IsTextField(120, 'Joao Silva')
  readonly nome?: string;

  @IsOptional()
  @IsTextField(120, 'joao@example.com')
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
