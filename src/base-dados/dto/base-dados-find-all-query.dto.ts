import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { IsOptional } from 'class-validator';
import { IsTextField } from 'src/common/decorators/is-text-field-value.decorator';
import { IsIdValid } from 'src/common/decorators/is-id-value.decorator';
export class BaseDadosFindAllQueryDto extends PaginationQueryDto {
  @IsIdValid()
  @IsOptional()
  readonly id?: number;

  @IsTextField(60, 'clientes')
  readonly nome?: string;

  @IsIdValid()
  @IsOptional()
  readonly usuarioId?: number;

  @IsIdValid()
  @IsOptional()
  readonly integracaoId?: number;
}
