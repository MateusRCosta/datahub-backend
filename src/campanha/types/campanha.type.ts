import {
  BaseDeDados,
  Campanha,
  IntegracaoCampanha,
  Template,
  Usuario,
  View,
} from '@prisma/client';

export enum STATUS_CAMPANHA {
  ENVIADA = 'enviada',
  EM_ENVIO = 'emEnvio',
  PAUSA = 'pausa',
  CANCELADA = 'cancelada',
  PENDENTE = 'pendente',
}

export type CampanhaVars = Record<string, string>;

export type CampanhaFindAll = Pick<
  Campanha,
  | 'id'
  | 'nome'
  | 'status'
  | 'scheduledAt'
  | 'executedAt'
  | 'finishedAt'
  | 'createdAt'
  | 'updatedAt'
> & {
  readonly usuario: Pick<Usuario, 'nome'>;
} & {
  readonly baseDeDados: Pick<BaseDeDados, 'nome'> | null;
} & {
  readonly view: Pick<View, 'nome'> | null;
} & {
  readonly template: Pick<Template, 'nome'> & {
    readonly integracaoCampanha: Pick<IntegracaoCampanha, 'nome' | 'provedor'>;
  };
};

export type CampanhaFindById = CampanhaFindAll &
  Pick<Campanha, 'vars' | 'contatoCampo'> & {
    readonly template: Pick<Template, 'id'>;
  };

export type CampanhaExecucao = Pick<
  Campanha,
  'id' | 'nome' | 'status' | 'vars' | 'contatoCampo' | 'viewId' | 'baseDeDadoId'
> & {
  readonly template: Pick<Template, 'config' | 'id'> & {
    readonly integracaoCampanha: Pick<
      IntegracaoCampanha,
      'provedor' | 'config'
    >;
  };
};

export type SourceConfig =
  | {
      readonly tipo: 'base';
      readonly baseDeDadoId: number;
      readonly campos: ReadonlySet<string>;
    }
  | {
      readonly tipo: 'view';
      readonly viewId: number;
    };
