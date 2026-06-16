import { IsOptional } from 'class-validator';
import { IsBooleanField } from 'src/common/decorators/is-boolean-field-value.decorator';
import { IsIdValid } from 'src/common/decorators/is-id-value.decorator';
import { IsTextField } from 'src/common/decorators/is-text-field-value.decorator';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';

export class IntegracaoFindAllQueryDto extends PaginationQueryDto {
  @IsIdValid()
  @IsOptional()
  readonly id?: number;

  @IsTextField(100, 'ixc')
  @IsOptional()
  readonly nome?: string;

  @IsIdValid()
  @IsOptional()
  readonly usuarioId?: number;

  @IsOptional()
  @IsBooleanField()
  readonly status?: boolean;
}
