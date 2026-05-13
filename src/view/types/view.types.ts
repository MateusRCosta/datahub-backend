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
  baseDadosIdJoin: number;
  campoFrom: string; // base de dados raiz
  campoJoin: string; // base de dados do join
  tipo: TIPO_JOIN;
};

export type Select = {
  baseDadosId: number;
  campos: {
    campo: string;
    rotulo: string;
  }[];
};

export type Filter = {
  baseDadosId: number;
  campo: string;
  operador: OPERADOR;
  valor: string | number | boolean;
};

export type GroupFilter = GroupNode | FilterNode;

export type GroupNode = {
  type: 'group';
  operadorWhere: OPERADOR_WHERE; // obrigatório quando é grupo
  groupFilter: GroupFilter[]; // obrigatório quando é grupo
};

export type FilterNode = {
  type: 'filter';
  filter: Filter; // obrigatório quando é folha
};
