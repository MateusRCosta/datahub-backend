import { IsOptional, Matches } from 'class-validator';
import { IsIdValid } from 'src/common/decorators/is-id-value.decorator';
import { IsNameField } from 'src/common/decorators/is-NAME-field-value.decorator';

export class CampanhaVarsDto {
  @IsNameField(100, 'id')
  @Matches(/^(?!#\s*$).+/, {
    message: 'The field cannot be empty or just a "#" symbol',
  })
  readonly nomeCampo!: string;

  @IsOptional()
  @IsIdValid()
  readonly baseDadoId?: number;
}
