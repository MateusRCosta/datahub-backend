import { Module } from '@nestjs/common';
import { PrismaService } from 'src/config/prisma.service';
import { IntegracaoCampanhaController } from './integracao-campanha.controller';
import { IntegracaoCampanhaService } from './integracao-campanha.service';
import { HttpService } from '@nestjs/axios';

@Module({
  controllers: [IntegracaoCampanhaController],
  providers: [IntegracaoCampanhaService, PrismaService, HttpService],
  exports: [IntegracaoCampanhaService],
})
export class IntegracaoCampanhaModule {}
