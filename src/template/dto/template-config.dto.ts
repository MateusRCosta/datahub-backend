import { Type, TypeHelpOptions } from 'class-transformer';
import { IsNumber, IsString, Max, MaxLength, ValidateNested } from 'class-validator';

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
  readonly rodapeTempalte!: string;

  @ValidateNested()
  readonly botoes!: BotoesDto[];
}

class BotaoBaseDto {
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


