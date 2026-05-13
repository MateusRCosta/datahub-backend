import {
  IsBoolean,
  IsNumber,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';

export class IntegracaoHeaderDto {
  @IsString()
  @MaxLength(100)
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
