import { Type } from 'class-transformer';
import {
  IsArray,
  IsNotEmptyObject,
  IsObject,
  IsOptional,
  MinDate,
  ValidateNested,
} from 'class-validator';
import { CampanhaVarsDto } from './campanha-contato-vars.dto';
import { ApiProperty } from '@nestjs/swagger';
import { IsIdValid } from 'src/common/decorators/is-id-value.decorator';
import { IsNameField } from 'src/common/decorators/is-NAME-field-value.decorator';

export class CampanhaCreateDto {
  @IsNameField(100, 'id')
  readonly nome!: string;

  @ApiProperty({
    type: 'string',
    format: 'date',
    example: new Date(1986, 11, 11),
  })
  @Type(() => Date)
  @MinDate(() => new Date(), {
    message: () =>
      `data mínima pertimida para agendamento é ${new Date().toDateString()}`,
  })
  readonly scheduledAt!: Date;

  @IsIdValid()
  readonly templateId!: number;

  @IsOptional()
  @IsIdValid()
  readonly viewId?: number;

  @IsOptional()
  @IsIdValid()
  readonly baseDadosId?: number;

  @ValidateNested()
  @IsObject()
  @IsNotEmptyObject()
  @Type(() => CampanhaVarsDto)
  readonly contatoCampo!: CampanhaVarsDto;

  @ValidateNested({ each: true })
  @IsArray()
  @Type(() => CampanhaVarsDto)
  readonly vars!: CampanhaVarsDto[];
}
