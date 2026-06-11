import { IsEnum, IsOptional } from 'class-validator';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { STATUS_CAMPANHA } from '../types/campanha.type';
import { IsNameField } from 'src/common/decorators/is-name-field-value.decorator';
import { IsIdValid } from 'src/common/decorators/is-id-value.decorator';

export class CampanhaFindAllQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsIdValid()
  readonly id?: number;

  @IsOptional()
  @IsNameField(100, 'Campanha de inverno')
  readonly nome?: string;

  @IsOptional()
  @IsEnum(STATUS_CAMPANHA)
  readonly status?: STATUS_CAMPANHA;

  @IsOptional()
  @IsIdValid()
  readonly templateId?: number;

  @IsOptional()
  @IsIdValid()
  readonly viewId?: number;

  @IsOptional()
  @IsIdValid()
  readonly baseDeDadosId?: number;

  @IsOptional()
  @IsIdValid()
  readonly usuarioId?: number;
}
