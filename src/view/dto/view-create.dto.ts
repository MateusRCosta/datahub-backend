import { Type } from 'class-transformer';
import { IsOptional, ValidateNested } from 'class-validator';
import { IsTextField } from 'src/common/decorators/is-text-field-value.decorator';
import { ViewQueryDto } from './view-query.dto';

export class ViewCreateDto {
  @IsTextField(100, 'View clientes')
  readonly nome!: string;

  @IsTextField(100, 'Clientes ativos')
  @IsOptional()
  readonly descricao?: string;

  @ValidateNested()
  @Type(() => ViewQueryDto)
  readonly config!: ViewQueryDto;
}
