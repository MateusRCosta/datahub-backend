import { IsIn, IsOptional } from 'class-validator';
import { IsIntNumberField } from 'src/common/decorators/is-int-number-field-value.decorator';
import { IsTextField } from 'src/common/decorators/is-text-field-value.decorator';

export class PaginationQueryDto {
  @IsOptional()
  @IsIntNumberField(1000, 1, 1)
  readonly page?: number = 1;

  @IsOptional()
  @IsIntNumberField(100, 10, 1)
  readonly limit?: number = 10;

  @IsOptional()
  @IsTextField(50, 'createdAt')
  readonly orderBy?: string = 'createdAt';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  readonly order?: 'asc' | 'desc' = 'desc';
}
