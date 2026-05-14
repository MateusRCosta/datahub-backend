import { Module } from '@nestjs/common';
import { IntegracaoCampanhaModule } from 'src/integracao-campanha/integracao-campanha.module';
import { ViewModule } from 'src/view/view.module';
import { ClientesModule } from 'src/cliente/cliente.module';
import { PrismaService } from 'src/config/prisma.service';
import { CampanhaController } from './campanha.controller';
import { CampanhaJobService } from './campanha-job.service';
import { CampanhaSchedulerService } from './campanha-scheduler.service';
import { CampanhaService } from './campanha.service';
import { ClienteCampanhaService } from './cliente-campanha.service';

@Module({
  imports: [IntegracaoCampanhaModule, ViewModule, ClientesModule],
  controllers: [CampanhaController],
  providers: [
    CampanhaService,
    ClienteCampanhaService,
    CampanhaJobService,
    CampanhaSchedulerService,
    PrismaService,
  ],
})
export class CampanhaModule {}
