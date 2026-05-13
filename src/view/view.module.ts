import { Module } from '@nestjs/common';
import { PrismaService } from 'src/config/prisma.service';
import { ViewController } from './view.controller';
import { ViewQueryBuilderService } from './view-query-builder.service';
import { ViewService } from './view.service';

@Module({
  controllers: [ViewController],
  providers: [ViewService, ViewQueryBuilderService, PrismaService],
  exports: [ViewService, ViewQueryBuilderService],
})
export class ViewModule {}
