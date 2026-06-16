import { IsOptional, Matches } from 'class-validator';
import { IsIdValid } from 'src/common/decorators/is-id-value.decorator';
import { IsTextField } from 'src/common/decorators/is-text-field-value.decorator';

export class CampanhaVarsDto {
  @IsTextField(100, 'nomeCliente')
  readonly variavel!: string;

  @IsTextField(100, '#nome')
  @Matches(/^(?!#\s*$).+/, {
    message: 'O campo não pode ser vazio ou apenas "#"',
  })
  readonly valor!: string;

  @IsOptional()
  @IsIdValid()
  readonly baseDadosId?: number;
}
