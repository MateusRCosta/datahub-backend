import { Module } from '@nestjs/common';
import { CsvModule } from 'nest-csv-parser';
import { BasesDadosController } from './base-dados.controller';
import { BasesDadosService } from './base-dados.service';
import { PrismaService } from 'src/config/prisma.service';
import { ClientesModule } from 'src/cliente/cliente.module';

@Module({
  imports: [CsvModule, ClientesModule],
  controllers: [BasesDadosController],
  providers: [BasesDadosService, PrismaService],
  exports: [BasesDadosService],
})
export class BasesDadosModule {}
