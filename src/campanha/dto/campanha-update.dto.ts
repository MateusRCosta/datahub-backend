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

export class CampanhaUpdateDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  readonly nome?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  readonly scheduledAt?: Date;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  readonly templateId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  readonly viewId?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  readonly baseDadosId?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  readonly contatoCampo?: string;

  @IsOptional()
  @IsObject()
  readonly vars?: CampanhaVars;
}
