import { IsEnum } from 'class-validator';
import { STATUS_CAMPANHA } from '../types/campanha.type';

export class CampanhaAlteraStatusDto {
  @IsEnum(STATUS_CAMPANHA)
  readonly status!: STATUS_CAMPANHA;
}
