import { Prisma, Usuario } from '@prisma/client';

export enum TIPO_JOIN {
  INNER = 'INNER',
}

export enum OPERADOR {
  AND = 'and',
  OR = 'or',
  EQUAL = 'eq',
  DIFFERENT = 'df',
  GREATER = 'gt',
  LESS = 'lt',
  GREATER_EQUAL = 'gte',
  LESS_EQUAL = 'lte',
  CONTAINS = 'contains',
  START_WITH = 'startsWith',
  IS_NULL = 'isNull',
  IS_NOT_NULL = 'isNotNull',
}

export enum OPERADOR_WHERE {
  AND = 'and',
  OR = 'or',
}

export enum TIPO_FILTRO {
  FILTER = 'filter',
  GROUP = 'group',
}
export type QueryView = {
  from: From;
  joins?: Join[];
  select?: Select[];
  groupFilter?: GroupFilter[];
};

export type From = {
  baseDadosId: number;
};

export type Join = {
  joinIndex: number; // 1-based
  fromJoinIndex?: number;
  baseDadosIdJoin: number;
  campoFrom: string;
  campoJoin: string;
  tipo: TIPO_JOIN;
};

export type Select = {
  joinIndex: number; // 0 = root FROM, 1+ = join
  baseDadosId: number;
  campos: {
    campo: string;
    rotulo: string;
  }[];
};

export type Filter = {
  joinIndex: number; // 0 = root FROM, 1+ = join
  baseDadosId: number;
  campo: string;
  operador: OPERADOR;
  valor: string | number | boolean;
};

export type GroupFilter = GroupNode | FilterNode;

export type GroupNode = {
  type: TIPO_FILTRO.GROUP;
  operadorWhere: OPERADOR_WHERE; // obrigatório quando é grupo
  groupFilter: GroupFilter[]; // obrigatório quando é grupo
};

export type FilterNode = {
  type: TIPO_FILTRO.FILTER;
  filter: Filter; // obrigatório quando é folha
};

export type ViewListItem = {
  id: number;
  nome: string;
  usuario: Pick<Usuario, 'nome'>;
  createdAt: Date;
  updatedAt: Date | null;
};

export type ViewDetails = ViewListItem & {
  config: Prisma.JsonValue;
};

export type ViewRowWithClienteId = Record<string, unknown> & {
  readonly _clienteId: number;
};
