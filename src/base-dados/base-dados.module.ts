import { Module } from '@nestjs/common';
import { CsvModule } from 'nest-csv-parser';
import { BaseDadosController } from './base-dados.controller';
import { BaseDadosService } from './base-dados.service';
import { PrismaService } from 'src/config/prisma.service';
import { ClientesModule } from 'src/cliente/cliente.module';

@Module({
  imports: [CsvModule, ClientesModule],
  controllers: [BaseDadosController],
  providers: [BaseDadosService, PrismaService],
  exports: [BaseDadosService],
})
export class BaseDadosModule {}
