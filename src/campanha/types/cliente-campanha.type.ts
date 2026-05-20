import { Cliente, ClienteCampanha, Prisma } from '@prisma/client';

export enum STATUS_CLIENTE_CAMPANHA {
  PENDENTE = 'pendente',
  ENVIADO = 'enviado',
  EM_ENVIO = 'emEnvio',
  ERRO = 'erro',
  CANCELADO = 'cancelado',
}

export type ClienteCampanhaFindAll = Pick<
  ClienteCampanha,
  'id' | 'status' | 'clienteId' | 'createdAt' | 'updatedAt'
> & {
  readonly cliente: Pick<Cliente, 'id'> & {
    readonly dados: Prisma.JsonValue;
  };
};

export type ClienteCampanhaPendente = Pick<
  ClienteCampanha,
  'id' | 'clienteId'
> & {
  readonly cliente: Pick<Cliente, 'id'> & {
    readonly dados: Prisma.JsonValue;
  };
};
