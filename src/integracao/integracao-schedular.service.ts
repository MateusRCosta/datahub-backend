import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { IntegracaoService } from './integracao.service';
import {
  IntegracaoAgendamento,
  JobIntegracaoReservado,
  STATUS_JOB,
} from './types/integracao.type';
import { Job } from '@prisma/client';
import { PrismaService } from 'src/config/prisma.service';

@Injectable()
export class IntegracaoSchedularService {
  constructor(
    @Inject(forwardRef(() => IntegracaoService))
    private readonly integracoesService: IntegracaoService,
    private readonly prismaService: PrismaService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async executaJobsPendentes(): Promise<void> {
    while (true) {
      const job = await this.pegaProximoJobPendente();

      if (!job) {
        return;
      }
      await this.integracoesService.executa(job.integracaoId, job.id);
    }
  }

  async agendaIntegracao(integracao: IntegracaoAgendamento): Promise<Job> {
    await this.cancelaAgendamento(integracao.id);

    return this.prismaService.job.create({
      data: {
        integracaoId: integracao.id,
        tipo: 'cliente',
        status: STATUS_JOB.PENDENTE,
        scheduledAt: this.calculaProximoAgendamento(
          integracao.horaExecucao ?? 0,
        ),
      },
    });
  }

  async aplicaAgendamentoPorStatus(
    integracao: IntegracaoAgendamento,
    status: boolean,
  ): Promise<void> {
    if (!status) {
      await this.cancelaAgendamento(integracao.id);
      return;
    }

    await this.agendaIntegracao(integracao);
  }

  async cancelaAgendamento(idIntegracao: number): Promise<void> {
    await this.prismaService.job.deleteMany({
      where: {
        integracaoId: idIntegracao,
        tipo: 'cliente',
        status: STATUS_JOB.PENDENTE,
      },
    });
  }

  async pegaProximoJobPendente(): Promise<JobIntegracaoReservado | null> {
    return this.prismaService.$transaction(async (prisma) => {
      const [job] = await prisma.$queryRaw<JobIntegracaoReservado[]>`
          SELECT jobs."id", jobs."integracaoId"
          FROM "jobs"
          INNER JOIN "integracoes"
            ON "integracoes"."id" = jobs."integracaoId"
          WHERE jobs."tipo" = 'cliente'
            AND jobs."status" = ${STATUS_JOB.PENDENTE}
            AND jobs."scheduledAt" <= NOW()
            AND "integracoes"."status" = true
            AND "integracoes"."deletedAt" IS NULL
          ORDER BY jobs."scheduledAt" ASC
          FOR UPDATE SKIP LOCKED
          LIMIT 1
        `;

      if (!job) {
        return null;
      }

      const jobAtualizado = await prisma.job.update({
        where: { id: job.id },
        data: this.montaAtualizacaoStatus(STATUS_JOB.RODANDO),
        select: {
          id: true,
          integracaoId: true,
        },
      });

      if (!jobAtualizado.integracaoId) {
        return null;
      }

      return {
        id: jobAtualizado.id,
        integracaoId: jobAtualizado.integracaoId,
      };
    });
  }

  async atualizaStatus(jobId: number, status: STATUS_JOB): Promise<Job> {
    const job = await this.prismaService.job.update({
      where: { id: jobId },
      data: this.montaAtualizacaoStatus(status),
      include: {
        integracao: {
          select: {
            id: true,
            horaExecucao: true,
            status: true,
            deletedAt: true,
          },
        },
      },
    });

    if (this.statusFinalizaExecucao(status) && job.integracao) {
      await this.aplicaAgendamentoPorStatus(
        job.integracao,
        job.integracao.status,
      );
    }

    return job;
  }

  private montaAtualizacaoStatus(status: STATUS_JOB) {
    if (status === STATUS_JOB.RODANDO) {
      return {
        status,
        executedAt: new Date(),
        finishedAt: null,
      };
    }

    if (status === STATUS_JOB.COMPLETO || status === STATUS_JOB.ERRO) {
      return {
        status,
        finishedAt: new Date(),
      };
    }

    return { status };
  }

  private statusFinalizaExecucao(status: STATUS_JOB): boolean {
    return status === STATUS_JOB.COMPLETO || status === STATUS_JOB.ERRO;
  }

  private calculaProximoAgendamento(horaAgendamento: number): Date {
    const agora = new Date();
    const scheduledAt = new Date(agora);

    scheduledAt.setHours(horaAgendamento, 0, 0, 0);

    if (scheduledAt <= agora) {
      scheduledAt.setDate(scheduledAt.getDate() + 1);
    }

    return scheduledAt;
  }
}
