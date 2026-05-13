import { IntegracaoVariavelDto } from '../dto/integracao-variavel-dto';

export type IntegracaoAgendamento = {
  id: number;
  horaExecucao?: number;
};

export type JobIntegracaoReservado = {
  id: number;
  integracaoId: number;
};

export type TipoRequisicao = 'AUTH' | 'REFRESH' | 'SCRAP';

export type ContextoIntegracao = IntegracaoVariavelDto[];

export type DadosCliente = Record<string, unknown>;

export type ConfiguracaoEtapa = {
  url: string | null;
  headers: unknown;
  metodo: string | null;
  variaveis: unknown;
  response: unknown;
  body: string | null;
};

export type RespostaEtapa = {
  data: unknown;
  statusCode: number;
  contexto: ContextoIntegracao;
};

export type ResultadoExecucao<T> = {
  sucesso: boolean;
  statusCode: number;
  message: string;
  dados: T | null;
};

export type ControleLimiteRequisicao = {
  inicioJanela: number | null;
  requisicoesNaJanela: number;
  limitePorMinuto: number;
};

export enum STATUS_JOB {
  PENDENTE = 'PENDENTE',
  RODANDO = 'RODANDO',
  COMPLETO = 'COMPLETO',
  ERRO = 'ERRO',
}
