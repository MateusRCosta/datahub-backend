import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class ClienteCampoValidacaoErroDto {
  @IsString()
  @MaxLength(100)
  @IsNotEmpty()
  field!: string;

  @IsString()
  @MaxLength(50)
  @IsNotEmpty()
  code!: string;

  @IsString()
  @MaxLength(200)
  @IsNotEmpty()
  message!: string;
}

class ClienteCampoValidacaoDto {
  @IsString()
  @MaxLength(100)
  @IsNotEmpty()
  nome!: string;

  @IsBoolean()
  vazio!: boolean;

  @IsBoolean()
  validado!: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ClienteCampoValidacaoErroDto)
  erros?: ClienteCampoValidacaoErroDto[];
}

export class ClienteUpdateDto {
  @IsOptional()
  @IsObject()
  dados?: Record<string, unknown>;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ClienteCampoValidacaoDto)
  validacao?: ClienteCampoValidacaoDto[];
}
