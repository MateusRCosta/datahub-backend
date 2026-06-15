import { IsOptional, Matches } from 'class-validator';
import { IsIdValid } from 'src/common/decorators/is-id-value.decorator';
import { IsNameField } from 'src/common/decorators/is-name-field-value.decorator';

export class CampanhaVarsDto {
  @IsNameField(100, 'nomeCliente')
  readonly variavel!: string;

  @IsNameField(100, '#nome')
  @Matches(/^(?!#\s*$).+/, {
    message: 'O campo não pode ser vazio ou apenas "#"',
  })
  readonly valor!: string;

  @IsOptional()
  @IsIdValid()
  readonly baseDadosId?: number;
}
