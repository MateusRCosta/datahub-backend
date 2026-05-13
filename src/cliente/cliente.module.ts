import { Module } from '@nestjs/common';
import { PrismaService } from 'src/config/prisma.service';
import { ClientesCriacaoService } from './cliente-criacao.service';
import { ClientesController } from './cliente.controller';
import { ClientesService } from './cliente.service';

@Module({
  controllers: [ClientesController],
  providers: [ClientesService, ClientesCriacaoService, PrismaService],
  exports: [ClientesService, ClientesCriacaoService],
})
export class ClientesModule {}
