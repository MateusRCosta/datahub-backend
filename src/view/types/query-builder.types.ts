import { Prisma } from '@prisma/client';
import { TipoCampo } from 'src/base-dados/util/type';
import { Join } from './view.types';

export type BuiltQuery = {
  readonly sql: string;
  readonly params: readonly unknown[];
};

export type QueryContext = {
  readonly aliasesByKey: Map<string, string>;
  readonly joinIndexParaBaseDadosId: Map<number, number>;
  readonly estruturasByBaseDadosId: Map<number, Map<string, TipoCampo>>;
  readonly params: unknown[];
};
export type RuntimeJoin = Join & {
  readonly fromBaseDadosId?: number;
};

export type BaseMetadata = {
  readonly id: number;
  readonly estrutura: Prisma.JsonValue;
};
