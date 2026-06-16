import { IsEnum, IsOptional } from 'class-validator';
import { IsBooleanField } from 'src/common/decorators/is-boolean-field-value.decorator';
import { IsIdValid } from 'src/common/decorators/is-id-value.decorator';
import { IsTextField } from 'src/common/decorators/is-text-field-value.decorator';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { PROVEDOR_INTEGRACAO_CAMPANHA } from '../types/provedor-integracao-campanha.type';

export class IntegracaoCampanhaFindAllQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsIdValid()
  readonly id?: number;

  @IsTextField(120, 'Upchat')
  @IsOptional()
  readonly nome!: string;

  @IsOptional()
  @IsEnum(PROVEDOR_INTEGRACAO_CAMPANHA)
  readonly provedor?: PROVEDOR_INTEGRACAO_CAMPANHA;

  @IsOptional()
  @IsBooleanField(true)
  readonly status?: boolean;
}
