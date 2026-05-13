import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { IntegracaoService } from './integracao.service';
import { IntegracoesJobService } from './integracao-job.service';

@Injectable()
export class IntegracoesSchedularService {
  constructor(
    private readonly integracoesService: IntegracaoService,
    private readonly integracoesJobService: IntegracoesJobService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async executaJobsPendentes(): Promise<void> {
    while (true) {
      const job = await this.integracoesJobService.pegaProximoJobPendente();

      if (!job) {
        return;
      }
      await this.integracoesService.executaIntegracao(job.integracaoId, job.id);
    }
  }
}
