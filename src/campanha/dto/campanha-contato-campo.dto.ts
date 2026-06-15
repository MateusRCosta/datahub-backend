import { IsOptional } from 'class-validator';
import { IsIdValid } from 'src/common/decorators/is-id-value.decorator';
import { IsNameField } from 'src/common/decorators/is-name-field-value.decorator';

export class CampanhaContatoCampoDto {
  @IsNameField(100, 'telefone')
  readonly valor!: string;

  @IsOptional()
  @IsIdValid()
  readonly baseDadosId?: number;
}
