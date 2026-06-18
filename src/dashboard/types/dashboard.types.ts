import { STATUS_CAMPANHA } from 'src/campanha/types/campanha.type';
import { STATUS_JOB } from 'src/integracao/types/integracao.type';

export type DashboardBasesDados = {
  readonly totalBases: number;
  readonly totalClientes: number;
};

export type DashboardVisualizacoes = {
  readonly total: number;
};

export type DashboardCampanhas = {
  readonly totalPorStatus: Readonly<Record<STATUS_CAMPANHA, number>>;
};

export type DashboardIntegracoes = {
  readonly ativas: number;
  readonly inativas: number;
  readonly jobsPorStatus: Readonly<Record<STATUS_JOB, number>>;
};

export type DashboardUsuarios = {
  readonly ativos: number;
  readonly inativos: number;
};

export type DashboardAlerta = {
  readonly tipo: 'JOB_ERRO' | 'CAMPANHA_ENVIO_ERRO';
  readonly gravidade: 'erro' | 'aviso';
  readonly recursoId: number;
  readonly titulo: string;
  readonly ocorridoEm: string;
};

export type DashboardResponse = {
  readonly generatedAt: string;
  readonly basesDados?: DashboardBasesDados;
  readonly visualizacoes?: DashboardVisualizacoes;
  readonly campanhas?: DashboardCampanhas;
  readonly integracoes?: DashboardIntegracoes;
  readonly usuarios?: DashboardUsuarios;
  readonly alertas: readonly DashboardAlerta[];
};
