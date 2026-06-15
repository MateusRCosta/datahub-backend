import { VarValor } from 'src/common/interfaces/integracao-campanha.interface';
import { UpchatExecuta } from './upchat.type';

export type AtivaExecucao = UpchatExecuta;

export type Mensagem = {
  meio: string;
  parametros: VarValor[];
};
