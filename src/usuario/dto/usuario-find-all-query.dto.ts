import { IsArray, IsEnum, IsOptional } from 'class-validator';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { Permissao } from '../interfaces/permissao';
import { IsIdValid } from 'src/common/decorators/is-id-value.decorator';
import { IsTextField } from 'src/common/decorators/is-text-field-value.decorator';
import { IsBooleanField } from 'src/common/decorators/is-boolean-field-value.decorator';

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
  @IsBooleanField(false)
  readonly admin?: boolean;

  @IsOptional()
  @IsBooleanField(true)
  readonly ativo?: boolean;

  @IsOptional()
  @IsArray()
  @IsEnum(Permissao, { each: true })
  readonly permissoes?: Permissao[];
}
