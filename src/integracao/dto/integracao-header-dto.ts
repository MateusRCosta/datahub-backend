import {
  IsBoolean,
  IsNumber,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { IsTextField } from 'src/common/decorators/is-text-field-value.decorator';

export class IntegracaoHeaderDto {
  @IsTextField(100, 'Authorization')
  readonly chave!: string;

  @ValidateIf((_, value) => typeof value === 'string')
  @IsString()
  @MaxLength(100)
  @ValidateIf((_, value) => typeof value === 'number')
  @IsNumber()
  @ValidateIf((_, value) => typeof value === 'boolean')
  @IsBoolean()
  readonly valor!: string | number | boolean;
}
