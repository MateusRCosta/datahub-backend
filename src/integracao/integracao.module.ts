import { Module } from '@nestjs/common';
import { IntegracaoService } from './integracao.service';
import { PrismaService } from '../config/prisma.service';
import { IntegracaoController } from './integracao.controller';
import { HttpModule } from '@nestjs/axios';
import { IntegracaoExecucaoService } from './integracao-execucao.service';
import { BasesDadosModule } from 'src/base-dados/base-dados.module';
import { IntegracaoSchedularService } from './integracao-schedular.service';

@Module({
  imports: [HttpModule, BasesDadosModule],
  controllers: [IntegracaoController],
  providers: [
    IntegracaoService,
    IntegracaoExecucaoService,
    IntegracaoSchedularService,
    PrismaService,
  ],
})
export class IntegracaoModule {}
