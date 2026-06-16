import { Type } from 'class-transformer';
import { IsArray, IsOptional, ValidateNested } from 'class-validator';
import { BaseDadosEstruturaDto } from './base-dados-estrutura.dto';
import { IsTextField } from 'src/common/decorators/is-text-field-value.decorator';

export class BaseDadosUpdateDto {
  @IsTextField(60, 'clientes')
  @IsOptional()
  nome?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BaseDadosEstruturaDto)
  estrutura?: BaseDadosEstruturaDto[];
}
