import { IsOptional } from 'class-validator';
import { IsIdValid } from 'src/common/decorators/is-id-value.decorator';
import { IsTextField } from 'src/common/decorators/is-text-field-value.decorator';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';

export class ViewFindAllDto extends PaginationQueryDto {
  @IsOptional()
  @IsIdValid()
  readonly id?: number;

  @IsOptional()
  @IsTextField(100, 'View clientes')
  readonly nome?: string;
}
