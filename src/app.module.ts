import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from './auth/auth.module';
import configuration from './config/configuration';
import { UsuariosModule } from './usuario/usuario.module';
import { BasesDadosModule } from './base-dados/base-dados.module';
import { ClientesModule } from './cliente/cliente.module';
import { IntegracaoModule } from './integracao/integracao.module';
import { IntegracaoCampanhaModule } from './integracao-campanha/integracao-campanha.module';
import { ViewModule } from './view/view.module';
import { TemplateModule } from './template/template.module';
import { CampanhaModule } from './campanha/campanha.module';

@Module({
  imports: [
    ConfigModule.forRoot({ load: [configuration] }),
    ScheduleModule.forRoot(),
    AuthModule,
    UsuariosModule,
    BasesDadosModule,
    ClientesModule,
    IntegracaoModule,
    IntegracaoCampanhaModule,
    ViewModule,
    TemplateModule,
    CampanhaModule,
  ],
})
export class AppModule {}
