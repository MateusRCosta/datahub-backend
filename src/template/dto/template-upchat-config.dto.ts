import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsEnum,
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import {
  BOTAO_ENUM,
  BotaoDto,
  getBotaoDtoType,
} from '../types/template-upchat.types';

export class UpchatConfigDto {
  @IsNumber()
  @Max(65536)
  readonly id!: number;

  @IsString()
  @MaxLength(512)
  readonly nome!: string;

  @IsString()
  @MaxLength(60)
  readonly tituloTemplate!: string;

  @IsString()
  @MaxLength(1024)
  readonly mensagemTemplate!: string;

  @IsString()
  @MaxLength(60)
  readonly rodapeTemplate!: string;

  @IsArray()
  @ArrayMaxSize(3)
  @ValidateNested({ each: true })
  @Type(getBotaoDtoType)
  readonly botoes!: BotaoDto[];
}

class BotaoBaseDto {
  @IsEnum(BOTAO_ENUM)
  @IsOptional()
  readonly tipo?: BOTAO_ENUM;

  @IsString()
  @MaxLength(25)
  readonly textoBotao!: string;
}
export class BotaoFlowDto extends BotaoBaseDto {
  @IsString()
  @MaxLength(36)
  readonly flowId!: string;
}

export class BotaoQuickReplyDto extends BotaoBaseDto {}

export class BotaoUrlDto extends BotaoBaseDto {
  @IsString()
  @MaxLength(2000)
  readonly url!: string;
}

export class BotaoPhoneNumberDto extends BotaoBaseDto {
  @IsString()
  @MaxLength(20)
  readonly numeroTelefone!: string;
}
