import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from 'src/config/prisma.service';
import { CampanhaJobService } from './campanha-job.service';
import { CampanhaReservada } from './types/campanha-job.type';
import { STATUS_CAMPANHA } from './types/campanha.type';

@Injectable()
export class CampanhaSchedulerService {
  private readonly logger = new Logger(CampanhaSchedulerService.name);

  constructor(
    private readonly campanhaJobService: CampanhaJobService,
    private readonly prismaService: PrismaService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async executaCampanhasPendentes(): Promise<void> {
    while (true) {
      const campanha = await this.pegaProximaCampanhaPendente();

      if (!campanha) {
        return;
      }

      try {
        await this.campanhaJobService.executaCampanha(campanha.id);
      } catch (error: unknown) {
        this.logger.error(
          `Erro ao executar campanha ${campanha.id}`,
          error instanceof Error ? error.stack : String(error),
        );
        return;
      }
    }
  }

  private async pegaProximaCampanhaPendente(): Promise<CampanhaReservada | null> {
    return this.prismaService.$transaction(async (prisma) => {
      const [campanha] = await prisma.$queryRaw<CampanhaReservada[]>`
        SELECT c."id"
        FROM "campanhas" c
        WHERE c."deletedAt" IS NULL
          AND c."status" = ${STATUS_CAMPANHA.PENDENTE}
          AND c."scheduledAt" <= NOW()
        ORDER BY c."scheduledAt" ASC
        FOR UPDATE SKIP LOCKED
        LIMIT 1
      `;

      if (!campanha) {
        return null;
      }

      return prisma.campanha.update({
        where: { id: campanha.id },
        data: {
          status: STATUS_CAMPANHA.EM_ENVIO,
          executedAt: new Date(),
          updatedAt: new Date(),
        },
        select: { id: true },
      });
    });
  }
}
