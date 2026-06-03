import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { LoggerModule } from 'nestjs-pino';
import { AuthModule } from './auth/auth.module';
import configuration from './config/configuration';
import { loggerConfig } from './config/logger.config';
import { UsuariosModule } from './usuario/usuario.module';
import { BaseDadosModule } from './base-dados/base-dados.module';
import { ClientesModule } from './cliente/cliente.module';
import { IntegracaoModule } from './integracao/integracao.module';
import { IntegracaoCampanhaModule } from './integracao-campanha/integracao-campanha.module';
import { ViewModule } from './view/view.module';
import { TemplateModule } from './template/template.module';
import { CampanhaModule } from './campanha/campanha.module';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { LoggingInterceptor } from './config/logging-interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({ load: [configuration] }),
    LoggerModule.forRoot(loggerConfig),
    ScheduleModule.forRoot(),
    AuthModule,
    UsuariosModule,
    BaseDadosModule,
    ClientesModule,
    IntegracaoModule,
    IntegracaoCampanhaModule,
    ViewModule,
    TemplateModule,
    CampanhaModule,
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
})
export class AppModule {}
