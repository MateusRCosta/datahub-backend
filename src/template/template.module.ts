import { Module } from '@nestjs/common';
import { PrismaService } from 'src/config/prisma.service';
import { TemplateService } from './template.service';
import { TemplateController } from './template.controller';
import { IntegracaoCampanhaModule } from 'src/integracao-campanha/integracao-campanha.module';

@Module({
  imports: [IntegracaoCampanhaModule],
  controllers: [TemplateController],
  providers: [TemplateService, PrismaService],
  exports: [TemplateService],
})
export class TemplateModule {}
