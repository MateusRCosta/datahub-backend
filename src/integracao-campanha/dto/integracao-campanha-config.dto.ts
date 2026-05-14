import { Type } from 'class-transformer';
import type { TypeHelpOptions } from 'class-transformer';
import {
  IsEmail,
  IsInt,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  IntegracaoCampanhaComProvedor,
  IntegracaoCampanhaConfigType,
  PROVEDOR_INTEGRACAO_CAMPANHA,
} from '../types/provedor-integracao-campanha.type';

export class UpchatConfigDto {
  @IsString()
  @MaxLength(200)
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  readonly url!: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(32767)
  readonly queueId!: number;

  @IsString()
  @MaxLength(128)
  readonly apiKey!: string;
}

export class EmailConfigDto {
  @IsEmail()
  @MaxLength(120)
  readonly email!: string;
}

export class DisparoProConfigDto {
  @IsString()
  @MaxLength(128)
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
