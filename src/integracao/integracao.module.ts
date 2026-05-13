import { Module } from '@nestjs/common';
import { IntegracaoService } from './integracao.service';
import { PrismaService } from '../config/prisma.service';
import { IntegracaoController } from './integracao.controller';
import { HttpModule } from '@nestjs/axios';
import { IntegracaoExecucaoService } from './integracao-execucao.service';
import { IntegracoesJobService } from './integracao-job.service';
import { IntegracoesSchedularService } from './integracao-schedular.service';
import { BasesDadosModule } from 'src/base-dados/base-dados.module';

@Module({
  imports: [HttpModule, BasesDadosModule],
  controllers: [IntegracaoController],
  providers: [
    IntegracaoService,
    IntegracaoExecucaoService,
    IntegracoesJobService,
    IntegracoesSchedularService,
    PrismaService,
  ],
})
export class IntegracaoModule {}
