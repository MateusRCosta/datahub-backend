import { IsEnum, IsOptional } from 'class-validator';
import { IsIdValid } from 'src/common/decorators/is-id-value.decorator';
import { IsTextField } from 'src/common/decorators/is-text-field-value.decorator';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { PROVEDOR_INTEGRACAO_CAMPANHA } from 'src/integracao-campanha/types/provedor-integracao-campanha.type';

export class TemplateFindAllQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsIdValid()
  readonly id?: number;

  @IsOptional()
  @IsTextField(100, 'Template upchat')
  readonly nome?: string;

  @IsOptional()
  @IsEnum(PROVEDOR_INTEGRACAO_CAMPANHA)
  readonly provedor?: PROVEDOR_INTEGRACAO_CAMPANHA;

  @IsOptional()
  @IsIdValid()
  readonly integracaoCampanhaId?: number;
}
