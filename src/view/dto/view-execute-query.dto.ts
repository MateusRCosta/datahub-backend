import { IsOptional } from 'class-validator';
import { IsIntNumberField } from 'src/common/decorators/is-int-number-field-value.decorator';

export class ViewExecuteQueryDto {
  @IsOptional()
  @IsIntNumberField(1000, 1, 1)
  readonly page?: number = 1;

  @IsOptional()
  @IsIntNumberField(100, 10, 1)
  readonly limit?: number = 10;
}
