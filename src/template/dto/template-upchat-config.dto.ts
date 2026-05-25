import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsEnum,
  IsArray,
  IsNumber,
  IsString,
  Max,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { BOTAO_ENUM, BotaoDto } from '../types/template-upchat.types';

class BotaoBaseDto {
  @IsEnum(BOTAO_ENUM)
  readonly tipo!: BOTAO_ENUM;

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
  @Type(() => BotaoQuickReplyDto, {
    discriminator: {
      property: 'tipo',
      subTypes: [
        { name: BOTAO_ENUM.FLOW, value: BotaoFlowDto },
        { name: BOTAO_ENUM.QUICK_REPLY, value: BotaoQuickReplyDto },
        { name: BOTAO_ENUM.PHONE_NUMBER, value: BotaoPhoneNumberDto },
        { name: BOTAO_ENUM.URL, value: BotaoUrlDto },
      ],
    },
    keepDiscriminatorProperty: true,
  })
  readonly botoes!: BotaoDto[];
}
