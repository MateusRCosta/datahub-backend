import {
  BaseDeDados,
  Campanha,
  IntegracaoCampanha,
  Template,
  Usuario,
  View,
} from '@prisma/client';
import { BaseDadosEstruturaDto } from 'src/base-dados/dto/base-dados-estrutura.dto';
import { Campo } from 'src/common/types/dados.types';
import { QueryView } from 'src/view/types/view.types';

export enum STATUS_CAMPANHA {
  ENVIADA = 'enviada',
  EM_ENVIO = 'emEnvio',
  PAUSA = 'pausa',
  CANCELADA = 'cancelada',
  PENDENTE = 'pendente',
}

export type CampanhaVars = {
  nomeCampo: string;
  baseDadoId?: number;
};

export type CampanhaFindAll = Pick<
  Campanha,
  'id' | 'nome' | 'status' | 'scheduledAt'
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
  Pick<
    Campanha,
    | 'vars'
    | 'contatoCampo'
    | 'executedAt'
    | 'finishedAt'
    | 'createdAt'
    | 'updatedAt'
  > & {
    readonly template: Pick<Template, 'id' | 'quantidadeVars'>;
  } & {
    readonly baseDeDados: Pick<BaseDeDados, 'id' | 'estrutura'> | null;
  } & {
    readonly view: Pick<View, 'id' | 'config'> | null;
  } & {
    campos?: Campo[];
  };

export type CampanhaExecucao = Pick<
  Campanha,
  | 'id'
  | 'nome'
  | 'status'
  | 'vars'
  | 'contatoCampo'
  | 'viewId'
  | 'baseDeDadosId'
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
      readonly estrutura: BaseDadosEstruturaDto[];
      readonly campos: Set<string>;
    }
  | {
      readonly tipo: 'view';
      readonly query: QueryView;
      readonly viewId: number;
    };
