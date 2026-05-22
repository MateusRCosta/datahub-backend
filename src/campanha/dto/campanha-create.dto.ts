import { Type } from 'class-transformer';
import {
  IsDate,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import type { CampanhaVars } from '../types/campanha.type';

export class CampanhaCreateDto {
  @IsString()
  @MaxLength(100)
  readonly nome!: string;

  @Type(() => Date)
  @IsDate()
  readonly scheduledAt!: Date;

  @Type(() => Number)
  @IsInt()
  readonly templateId!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  readonly viewId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  readonly baseDadosId?: number;

  @IsString()
  @MaxLength(120)
  readonly contatoCampo!: string;

  @IsObject()
  readonly vars!: CampanhaVars;
}
