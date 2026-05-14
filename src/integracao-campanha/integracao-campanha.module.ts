import { Module } from '@nestjs/common';
import { PrismaService } from 'src/config/prisma.service';
import { IntegracaoCampanhaController } from './integracao-campanha.controller';
import { IntegracaoCampanhaService } from './integracao-campanha.service';
import { UpchatService } from './integracao/upchat.service';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [HttpModule],
  controllers: [IntegracaoCampanhaController],
  providers: [IntegracaoCampanhaService, UpchatService, PrismaService],
  exports: [IntegracaoCampanhaService],
})
export class IntegracaoCampanhaModule {}
