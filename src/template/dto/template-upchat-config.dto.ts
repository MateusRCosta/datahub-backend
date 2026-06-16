import { Type } from 'class-transformer';
import { ArrayMaxSize, IsEnum, IsArray, ValidateNested } from 'class-validator';
import { IsIntNumberField } from 'src/common/decorators/is-int-number-field-value.decorator';
import { IsTextField } from 'src/common/decorators/is-text-field-value.decorator';
import { BOTAO_ENUM, BotaoDto } from '../types/template-upchat.types';

class BotaoBaseDto {
  @IsEnum(BOTAO_ENUM)
  readonly tipo!: BOTAO_ENUM;

  @IsTextField(25, 'Confirmar')
  readonly textoBotao!: string;
}

export class BotaoFlowDto extends BotaoBaseDto {
  @IsTextField(36, 'flow-id')
  readonly flowId!: string;
}

export class BotaoQuickReplyDto extends BotaoBaseDto {}

export class BotaoUrlDto extends BotaoBaseDto {
  @IsTextField(2000, 'https://example.com')
  readonly url!: string;
}

export class BotaoPhoneNumberDto extends BotaoBaseDto {
  @IsTextField(20, '+5511999999999')
  readonly numeroTelefone!: string;
}

export class UpchatConfigDto {
  @IsIntNumberField(65536, 1, 0)
  readonly id!: number;

  @IsTextField(512, 'Template boas vindas')
  readonly nome!: string;

  @IsTextField(60, 'Boas vindas')
  readonly tituloTemplate!: string;

  @IsTextField(1024, 'Ola, seja bem-vindo')
  readonly mensagemTemplate!: string;

  @IsTextField(60, 'Equipe')
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
