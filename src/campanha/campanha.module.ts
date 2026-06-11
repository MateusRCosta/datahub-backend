import { Module } from '@nestjs/common';
import { IntegracaoCampanhaModule } from 'src/integracao-campanha/integracao-campanha.module';
import { ViewModule } from 'src/view/view.module';
import { ClientesModule } from 'src/cliente/cliente.module';
import { PrismaService } from 'src/config/prisma.service';
import { CampanhaController } from './campanha.controller';
import { CampanhaExecucaoService } from './campanha-execucao.service';
import { CampanhaSchedulerService } from './campanha-scheduler.service';
import { CampanhaService } from './campanha.service';
import { ClienteCampanhaService } from './cliente-campanha.service';
import { TemplateModule } from 'src/template/template.module';
import { BaseDadosModule } from 'src/base-dados/base-dados.module';
import { BaseDadosService } from 'src/base-dados/base-dados.service';

@Module({
  imports: [
    IntegracaoCampanhaModule,
    ViewModule,
    ClientesModule,
    BaseDadosModule,
    TemplateModule,
  ],
  controllers: [CampanhaController],
  providers: [
    CampanhaService,
    ClienteCampanhaService,
    BaseDadosService,
    CampanhaExecucaoService,
    CampanhaSchedulerService,
    PrismaService,
  ],
})
export class CampanhaModule {}
