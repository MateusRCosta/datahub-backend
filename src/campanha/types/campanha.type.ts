import {
  Campanha,
  IntegracaoCampanha,
  Template,
  Usuario,
} from '@prisma/client';

export enum STATUS_CAMPANHA {
  ENVIADO = 'enviado',
  EM_ENVIO = 'emEnvio',
  PAUSA = 'pausa',
  CANCELADO = 'cancelado',
  NAO_ENVIADO = 'naoEnviado',
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
  | 'templateId'
  | 'viewId'
  | 'baseDeDadoId'
  | 'createdAt'
  | 'updatedAt'
> & {
  readonly usuario: Pick<Usuario, 'id' | 'nome'>;
};

export type CampanhaFindById = CampanhaFindAll &
  Pick<Campanha, 'vars' | 'contatoCampo'> & {
    readonly template: Pick<Template, 'id' | 'nome'> & {
      readonly integracaoCampanha: Pick<
        IntegracaoCampanha,
        'id' | 'nome' | 'provedor'
      >;
    };
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
