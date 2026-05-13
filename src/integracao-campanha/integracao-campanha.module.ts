import { Module } from '@nestjs/common';
import { PrismaService } from 'src/config/prisma.service';
import { IntegracaoCampanhaController } from './integracao-campanha.controller';
import { IntegracaoCampanhaService } from './integracao-campanha.service';

@Module({
  controllers: [IntegracaoCampanhaController],
  providers: [IntegracaoCampanhaService, PrismaService],
  exports: [IntegracaoCampanhaService],
})
export class IntegracaoCampanhaModule {}
