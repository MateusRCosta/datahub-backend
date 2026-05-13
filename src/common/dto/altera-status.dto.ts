import { IsNotEmpty } from 'class-validator';

export class AlteraStatus {
  @IsNotEmpty()
  readonly status!: boolean;
}
