import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { IntegracaoResponseDto } from './integracao-response-dto';
import { IntegracaoHeaderDto } from './integracao-header-dto';
import { IntegracaoVariavelDto } from './integracao-variavel-dto';
import { METODO } from '../types/integracao.type';

export class IntegracaoCreateDto {
  @MaxLength(100)
  @IsString()
  readonly nome!: string;
  @Max(50)
  @IsNumber()
  readonly limitDeRequisicaoPorMin: number = 10;

  @Max(23)
  @Min(0)
  @IsNumber()
  readonly horaExecucao: number = 0;

  //auth
  @MaxLength(200)
  @IsString()
  @IsUrl()
  @IsOptional()
  readonly urlAuth!: string;

  @MaxLength(20)
  @IsString()
  @IsOptional()
  readonly metodoAuth!: METODO;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => IntegracaoHeaderDto)
  readonly headersAuth!: IntegracaoHeaderDto[];

  @MaxLength(1024)
  @IsString()
  @IsOptional()
  readonly bodyAuth!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => IntegracaoResponseDto)
  @IsOptional()
  readonly responseAuth!: IntegracaoResponseDto[];

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => IntegracaoVariavelDto)
  readonly variaveisAuth!: IntegracaoVariavelDto[];

  //refresh
  @MaxLength(200)
  @IsString()
  @IsUrl()
  @IsOptional()
  readonly urlRefresh!: string;

  @MaxLength(20)
  @IsString()
  @IsOptional()
  readonly metodoRefresh!: METODO;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => IntegracaoHeaderDto)
  @IsOptional()
  readonly headersRefresh!: IntegracaoHeaderDto[];

  @MaxLength(1024)
  @IsString()
  @IsOptional()
  readonly bodyRefresh!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => IntegracaoResponseDto)
  @IsOptional()
  readonly responseRefresh!: IntegracaoResponseDto[];

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => IntegracaoVariavelDto)
  readonly variaveisRefresh!: IntegracaoVariavelDto[];

  //scrap
  @MaxLength(200)
  @IsString()
  @IsUrl()
  readonly urlScrap!: string;

  @MaxLength(20)
  @IsString()
  readonly metodoScrap!: METODO;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => IntegracaoHeaderDto)
  @IsOptional()
  readonly headersScrap!: IntegracaoHeaderDto[];

  @MaxLength(1024)
  @IsString()
  @IsOptional()
  readonly bodyScrap!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => IntegracaoResponseDto)
  readonly responseScrap!: IntegracaoResponseDto[];

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => IntegracaoVariavelDto)
  readonly variaveisScrap!: IntegracaoVariavelDto[];
}
