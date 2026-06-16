import { IsArray, ValidateNested } from 'class-validator';
import { BaseDadosEstruturaDto } from './base-dados-estrutura.dto';
import { Type } from 'class-transformer';
import { IsNameField } from 'src/common/decorators/is-name-field-value.decorator';

export class BaseDadosCreateDto {
  @IsNameField(60, 'clientes')
  nome!: string;

  @Type(() => BaseDadosEstruturaDto)
  @IsArray()
  @ValidateNested({ each: true })
  estrutura!: BaseDadosEstruturaDto[];
}
