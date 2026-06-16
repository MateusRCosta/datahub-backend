import {
  IsArray,
  IsEnum,
  IsOptional,
  IsUrl,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { IntegracaoResponseDto } from './integracao-response-dto';
import { IntegracaoHeaderDto } from './integracao-header-dto';
import { IntegracaoVariavelDto } from './integracao-variavel-dto';
import { METODO } from '../types/integracao.type';
import { IsTextField } from 'src/common/decorators/is-text-field-value.decorator';
import { IsIntNumberField } from 'src/common/decorators/is-int-number-field-value.decorator';

export class IntegracaoCreateDto {
  @IsTextField(100, 'Scrapping contratos')
  readonly nome!: string;

  @IsIntNumberField(50, 10)
  readonly limitDeRequisicaoPorMin: number = 10;

  @IsIntNumberField(23, 4, 0)
  readonly horaExecucao: number = 0;

  //auth
  @IsTextField(200, 'https://api.example.com/auth')
  @IsUrl()
  @IsOptional()
  readonly urlAuth!: string;

  @IsEnum(METODO)
  @IsOptional()
  readonly metodoAuth!: METODO;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => IntegracaoHeaderDto)
  readonly headersAuth!: IntegracaoHeaderDto[];

  @IsTextField(1024, '{ "id":123 }')
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
  @IsTextField(200, 'https://api.example.com/refresh')
  @IsUrl()
  @IsOptional()
  readonly urlRefresh!: string;

  @IsEnum(METODO)
  @IsOptional()
  readonly metodoRefresh!: METODO;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => IntegracaoHeaderDto)
  @IsOptional()
  readonly headersRefresh!: IntegracaoHeaderDto[];

  @IsTextField(1024, '{ "id":123 }')
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
  @IsTextField(200, 'https://api.example.com/scrap')
  @IsUrl()
  readonly urlScrap!: string;

  @IsEnum(METODO)
  readonly metodoScrap!: METODO;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => IntegracaoHeaderDto)
  @IsOptional()
  readonly headersScrap!: IntegracaoHeaderDto[];

  @IsTextField(1024, '{ "id":123 }')
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
