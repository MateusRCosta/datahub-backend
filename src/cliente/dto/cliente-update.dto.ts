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

class ClienteCampoValidacaoDto {
  @IsString()
  @MaxLength(100)
  @IsNotEmpty()
  nome!: string;

  @IsBoolean()
  vazio!: boolean;

  @IsBoolean()
  validado!: boolean;
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
