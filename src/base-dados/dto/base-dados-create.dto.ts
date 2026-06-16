import { IsArray, ValidateNested } from 'class-validator';
import { BaseDadosEstruturaDto } from './base-dados-estrutura.dto';
import { Type } from 'class-transformer';
import { IsTextField } from 'src/common/decorators/is-text-field-value.decorator';

export class BaseDadosCreateDto {
  @IsTextField(60, 'clientes')
  nome!: string;

  @Type(() => BaseDadosEstruturaDto)
  @IsArray()
  @ValidateNested({ each: true })
  estrutura!: BaseDadosEstruturaDto[];
}
