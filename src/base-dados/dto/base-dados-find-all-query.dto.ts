import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { IsOptional } from 'class-validator';
import { IsNameField } from 'src/common/decorators/is-name-field-value.decorator';
import { IsIdValid } from 'src/common/decorators/is-id-value.decorator';
export class BaseDadosFindAllQueryDto extends PaginationQueryDto {
  @IsIdValid()
  @IsOptional()
  readonly id?: number;

  @IsNameField(60, 'clientes')
  readonly nome?: string;

  @IsIdValid()
  @IsOptional()
  readonly usuarioId?: number;

  @IsIdValid()
  @IsOptional()
  readonly integracaoId?: number;
}
