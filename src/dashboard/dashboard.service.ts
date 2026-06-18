import { Injectable } from '@nestjs/common';
import { STATUS_CAMPANHA } from 'src/campanha/types/campanha.type';
import { STATUS_CLIENTE_CAMPANHA } from 'src/campanha/types/cliente-campanha.type';
import { PrismaService } from 'src/config/prisma.service';
import type { Payload } from 'src/auth/types/payload';
import { STATUS_JOB } from 'src/integracao/types/integracao.type';
import { Permissao } from 'src/usuario/interfaces/permissao';
import type {
  DashboardAlerta,
  DashboardBasesDados,
  DashboardCampanhas,
  DashboardIntegracoes,
  DashboardResponse,
  DashboardUsuarios,
  DashboardVisualizacoes,
} from './types/dashboard.types';

type DashboardComAlertas<T> = {
  readonly resumo: T;
  readonly alertas: DashboardAlerta[];
};

@Injectable()
export class DashboardService {
  constructor(private readonly prismaService: PrismaService) {}

  async retornaResumo(
    usuario: Pick<Payload, 'admin' | 'permissoes'>,
  ): Promise<DashboardResponse> {
    const podeGerenciarBases =
      usuario.admin ||
      usuario.permissoes.includes(Permissao.GERENCIAR_BASE_DADOS);
    const podeGerenciarVisualizacoes =
      usuario.admin ||
      usuario.permissoes.includes(Permissao.GERENCIAR_VISUALIZACOES);
    const podeGerenciarCampanhas =
      usuario.admin ||
      usuario.permissoes.includes(Permissao.GERENCIAR_CAMPANHAS);
    const podeGerenciarIntegracoes =
      usuario.admin ||
      usuario.permissoes.includes(Permissao.GERENCIAR_INTEGRACOES);

    const [basesDados, visualizacoes, campanhas, integracoes, usuarios] =
      await Promise.all([
        podeGerenciarBases ? this.retornaBasesDados() : undefined,
        podeGerenciarVisualizacoes ? this.retornaVisualizacoes() : undefined,
        podeGerenciarCampanhas ? this.retornaCampanhas() : undefined,
        podeGerenciarIntegracoes ? this.retornaIntegracoes() : undefined,
        usuario.admin ? this.retornaUsuarios() : undefined,
      ]);

    const alertas = [
      ...(campanhas?.alertas ?? []),
      ...(integracoes?.alertas ?? []),
    ]
      .sort((a, b) => {
        if (a.gravidade !== b.gravidade) {
          return a.gravidade === 'erro' ? -1 : 1;
        }

        return b.ocorridoEm.localeCompare(a.ocorridoEm);
      })
      .slice(0, 5);

    return {
      generatedAt: new Date().toISOString(),
      ...(basesDados && { basesDados }),
      ...(visualizacoes && { visualizacoes }),
      ...(campanhas && { campanhas: campanhas.resumo }),
      ...(integracoes && { integracoes: integracoes.resumo }),
      ...(usuarios && { usuarios }),
      alertas,
    };
  }

  private async retornaBasesDados(): Promise<DashboardBasesDados> {
    const [totalBases, totalClientes] = await Promise.all([
      this.prismaService.baseDeDados.count({ where: { deletedAt: null } }),
      this.prismaService.cliente.count({
        where: { deletedAt: null, baseDeDados: { deletedAt: null } },
      }),
    ]);

    return { totalBases, totalClientes };
  }

  private async retornaVisualizacoes(): Promise<DashboardVisualizacoes> {
    return {
      total: await this.prismaService.view.count({
        where: { deletedAt: null },
      }),
    };
  }

  private async retornaCampanhas(): Promise<
    DashboardComAlertas<DashboardCampanhas>
  > {
    const [grupos, campanhasComErro] = await Promise.all([
      this.prismaService.campanha.groupBy({
        by: ['status'],
        where: { deletedAt: null },
        _count: { _all: true },
      }),
      this.prismaService.campanha.findMany({
        where: {
          deletedAt: null,
          clienteCampanhas: {
            some: { status: STATUS_CLIENTE_CAMPANHA.ERRO },
          },
        },
        orderBy: { updatedAt: 'desc' },
        take: 5,
        select: {
          id: true,
          nome: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              clienteCampanhas: {
                where: { status: STATUS_CLIENTE_CAMPANHA.ERRO },
              },
            },
          },
        },
      }),
    ]);
    const totalPorStatus: Record<STATUS_CAMPANHA, number> = {
      [STATUS_CAMPANHA.ENVIADA]: 0,
      [STATUS_CAMPANHA.EM_ENVIO]: 0,
      [STATUS_CAMPANHA.PAUSA]: 0,
      [STATUS_CAMPANHA.CANCELADA]: 0,
      [STATUS_CAMPANHA.PENDENTE]: 0,
    };

    for (const grupo of grupos) {
      const status = grupo.status as STATUS_CAMPANHA;
      if (status in totalPorStatus) {
        totalPorStatus[status] = grupo._count._all;
      }
    }

    return {
      resumo: { totalPorStatus },
      alertas: campanhasComErro.map((campanha) => ({
        tipo: 'CAMPANHA_ENVIO_ERRO',
        gravidade: 'erro',
        recursoId: campanha.id,
        titulo: `${campanha._count.clienteCampanhas} envios com erro na campanha: ${campanha.nome}`,
        ocorridoEm: (campanha.updatedAt ?? campanha.createdAt).toISOString(),
      })),
    };
  }

  private async retornaIntegracoes(): Promise<
    DashboardComAlertas<DashboardIntegracoes>
  > {
    const [gruposIntegracoes, gruposJobs, jobsComErro] = await Promise.all([
      this.prismaService.integracao.groupBy({
        by: ['status'],
        where: { deletedAt: null },
        _count: { _all: true },
      }),
      this.prismaService.job.groupBy({
        by: ['status'],
        where: { integracao: { deletedAt: null } },
        _count: { _all: true },
      }),
      this.prismaService.job.findMany({
        where: {
          status: STATUS_JOB.ERRO,
          integracao: { deletedAt: null },
        },
        orderBy: { finishedAt: 'desc' },
        take: 5,
        select: {
          id: true,
          createdAt: true,
          finishedAt: true,
          integracao: { select: { id: true, nome: true } },
        },
      }),
    ]);
    const jobsPorStatus: Record<STATUS_JOB, number> = {
      [STATUS_JOB.PENDENTE]: 0,
      [STATUS_JOB.RODANDO]: 0,
      [STATUS_JOB.COMPLETO]: 0,
      [STATUS_JOB.ERRO]: 0,
    };
    let ativas = 0;
    let inativas = 0;

    for (const grupo of gruposIntegracoes) {
      if (grupo.status) ativas = grupo._count._all;
      else inativas = grupo._count._all;
    }

    for (const grupo of gruposJobs) {
      const status = grupo.status as STATUS_JOB;
      if (status in jobsPorStatus) {
        jobsPorStatus[status] = grupo._count._all;
      }
    }

    return {
      resumo: { ativas, inativas, jobsPorStatus },
      alertas: jobsComErro.map((job) => ({
        tipo: 'JOB_ERRO',
        gravidade: 'erro',
        recursoId: job.integracao.id,
        titulo: `Erro na integracao: ${job.integracao.nome}`,
        ocorridoEm: (job.finishedAt ?? job.createdAt).toISOString(),
      })),
    };
  }

  private async retornaUsuarios(): Promise<DashboardUsuarios> {
    const grupos = await this.prismaService.usuario.groupBy({
      by: ['ativo'],
      where: { deletedAt: null },
      _count: { _all: true },
    });
    let ativos = 0;
    let inativos = 0;

    for (const grupo of grupos) {
      if (grupo.ativo) ativos = grupo._count._all;
      else inativos = grupo._count._all;
    }

    return { ativos, inativos };
  }
}
