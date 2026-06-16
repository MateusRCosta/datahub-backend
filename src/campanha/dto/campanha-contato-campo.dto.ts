import { IsOptional } from 'class-validator';
import { IsIdValid } from 'src/common/decorators/is-id-value.decorator';
import { IsTextField } from 'src/common/decorators/is-text-field-value.decorator';

export class CampanhaContatoCampoDto {
  @IsTextField(100, 'telefone')
  readonly valor!: string;

  @IsOptional()
  @IsIdValid()
  readonly baseDadosId?: number;
}
