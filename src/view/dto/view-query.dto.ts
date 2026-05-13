import { Type } from 'class-transformer';
import {
  IsArray,
  IsDefined,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { IsFilterValue } from 'src/common/decorators/is-filter-value.decorator';
import { OPERADOR, OPERADOR_WHERE, TIPO_JOIN } from '../types/view.types';

export class FromDto {
  @Type(() => Number)
  @IsInt()
  readonly baseDadosId!: number;
}

export class JoinDto {
  @Type(() => Number)
  @IsInt()
  readonly baseDadosIdJoin!: number;

  @IsString()
  readonly campoFrom!: string;

  @IsString()
  readonly campoJoin!: string;

  @IsEnum(TIPO_JOIN)
  readonly tipo!: TIPO_JOIN;
}

export class SelectCampoDto {
  @IsString()
  readonly campo!: string;

  @IsString()
  readonly rotulo!: string;
}

export class SelectDto {
  @Type(() => Number)
  @IsInt()
  readonly baseDadosId!: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SelectCampoDto)
  readonly campos!: SelectCampoDto[];
}

export class FilterDto {
  @Type(() => Number)
  @IsInt()
  readonly baseDadosId!: number;

  @IsString()
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
