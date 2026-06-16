import { Type } from 'class-transformer';
import {
  IsArray,
  IsDefined,
  IsEnum,
  IsIn,
  IsOptional,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { IsFilterValue } from 'src/common/decorators/is-filter-value.decorator';
import { IsIdValid } from 'src/common/decorators/is-id-value.decorator';
import { IsIntNumberField } from 'src/common/decorators/is-int-number-field-value.decorator';
import { IsTextField } from 'src/common/decorators/is-text-field-value.decorator';
import { OPERADOR, OPERADOR_WHERE, TIPO_JOIN } from '../types/view.types';
import { MAX_JOINS } from '../constants';

export class FromDto {
  @IsIdValid()
  readonly baseDadosId!: number;
}

export class JoinDto {
  @IsIdValid()
  readonly baseDadosIdJoin!: number;

  @IsTextField(100, 'cliente_id')
  readonly campoFrom!: string;

  @IsTextField(100, 'id')
  readonly campoJoin!: string;

  @IsEnum(TIPO_JOIN)
  readonly tipo!: TIPO_JOIN;
}

export class SelectCampoDto {
  @IsTextField(100, 'nome')
  readonly campo!: string;

  @IsTextField(100, 'Nome')
  readonly rotulo!: string;
}

export class SelectDto {
  @IsIdValid()
  readonly baseDadosId!: number;

  @IsIntNumberField(MAX_JOINS - 1, 0, 0)
  readonly joinIndex!: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SelectCampoDto)
  readonly campos!: SelectCampoDto[];
}

export class FilterDto {
  @IsIntNumberField(1000000, 0, 0)
  readonly joinIndex!: number;

  @IsIdValid()
  readonly baseDadosId!: number;

  @IsTextField(100, 'nome')
  readonly campo!: string;

  @IsEnum(OPERADOR)
  readonly operador!: OPERADOR;

  @IsDefined()
  @IsFilterValue()
  readonly valor!: string | number | boolean;
}

export class GroupFilterDto {
  @IsIn(['group', 'filter'])
  readonly type!: 'group' | 'filter';

  @ValidateIf((dto: GroupFilterDto) => dto.type === 'group')
  @IsDefined()
  @IsEnum(OPERADOR_WHERE)
  readonly operadorWhere!: OPERADOR_WHERE;

  @ValidateIf((dto: GroupFilterDto) => dto.type === 'group')
  @IsDefined()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GroupFilterDto)
  readonly groupFilter!: GroupFilterDto[];

  @ValidateIf((dto: GroupFilterDto) => dto.type === 'filter')
  @IsDefined()
  @ValidateNested()
  @Type(() => FilterDto)
  readonly filter!: FilterDto;
}

export class ViewQueryDto {
  @IsDefined()
  @ValidateNested()
  @Type(() => FromDto)
  readonly from!: FromDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => JoinDto)
  readonly joins?: JoinDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SelectDto)
  readonly select?: SelectDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GroupFilterDto)
  readonly groupFilter?: GroupFilterDto[];
}
