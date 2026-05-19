import { IsObject } from 'class-validator';

export class ClienteUpdateDto {
  @IsObject()
  readonly dados!: Record<string, unknown>;
}
