import { Type } from 'class-transformer';
import {
  IsArray,
  IsObject,
  IsOptional,
  MinDate,
  ValidateNested,
} from 'class-validator';
import { CampanhaVarsDto } from './campanha-contato-vars.dto';
import { ApiProperty } from '@nestjs/swagger';
import { IsIdValid } from 'src/common/decorators/is-id-value.decorator';
import { IsNameField } from 'src/common/decorators/is-name-field-value.decorator';

export class CampanhaUpdateDto {
  @IsOptional()
  @IsNameField(100, 'Campanha de natal')
  readonly nome?: string;

  @IsOptional()
  @ApiProperty({
    type: 'string',
    format: 'date',
    example: new Date(2026, 6, 11),
  })
  @Type(() => Date)
  @MinDate(() => new Date(), {
    message: () =>
      `data mínima pertimida para agendamento é ${new Date().toDateString()}`,
  })
  readonly scheduledAt?: Date;

  @IsOptional()
  @IsIdValid()
  readonly templateId?: number;

  @IsOptional()
  @IsIdValid()
  readonly viewId?: number;

  @IsOptional()
  @IsIdValid()
  readonly baseDadosId?: number;

  @IsOptional()
  @ValidateNested()
  @IsObject()
  @Type(() => CampanhaVarsDto)
  readonly contatoCampo?: CampanhaVarsDto;

  @IsOptional()
  @ValidateNested({ each: true })
  @IsArray()
  @Type(() => CampanhaVarsDto)
  readonly vars?: CampanhaVarsDto[];
}
