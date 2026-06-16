import type { TypeHelpOptions } from 'class-transformer';
import { IsEmail, IsUrl } from 'class-validator';
import { IsIntNumberField } from 'src/common/decorators/is-int-number-field-value.decorator';
import { IsTextField } from 'src/common/decorators/is-text-field-value.decorator';
import {
  IntegracaoCampanhaComProvedor,
  IntegracaoCampanhaConfigType,
  PROVEDOR_INTEGRACAO_CAMPANHA,
} from '../types/provedor-integracao-campanha.type';

export class UpchatConfigDto {
  @IsTextField(200, 'https://api.example.com')
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  readonly url!: string;

  @IsIntNumberField(32767, 0, 0)
  readonly queueId!: number;

  @IsTextField(128, 'api-key')
  readonly apiKey!: string;
}

export class EmailConfigDto {
  @IsEmail()
  @IsTextField(120, 'contato@example.com')
  readonly email!: string;
}

export class DisparoProConfigDto {
  @IsTextField(128, 'api-key')
  readonly apiKey!: string;
}

export function getIntegracaoCampanhaConfigType(
  typeOptions?: TypeHelpOptions,
): IntegracaoCampanhaConfigType {
  const dto = typeOptions?.object as IntegracaoCampanhaComProvedor | undefined;

  switch (dto?.provedor) {
    case PROVEDOR_INTEGRACAO_CAMPANHA.UPCHAT:
      return UpchatConfigDto;

    case PROVEDOR_INTEGRACAO_CAMPANHA.EMAIL:
      return EmailConfigDto;

    case PROVEDOR_INTEGRACAO_CAMPANHA.DISPARO_PRO:
      return DisparoProConfigDto;

    default:
      return Object;
  }
}
