import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import multipart from '@fastify/multipart';
import { ValidationPipe } from '@nestjs/common';
import fastifyCookie from '@fastify/cookie';
import configuration from './config/configuration';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );

  const config = new DocumentBuilder()
    .setTitle('API de desenvolvimento')
    .setDescription(
      'Documentação da API do backend para desenvolvimento do frontend',
    )
    .setVersion('1.0')
    .build();

  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, documentFactory(), {
    jsonDocumentUrl: '/api-docs-json',
  });

  const { cors, port } = configuration();
  app.enableCors({
    origin: cors.origin,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  await app.register(multipart);

  await app.register(fastifyCookie, {
    secret: 'cookie-secret',
  });
  await app.listen(port, '0.0.0.0');
}
void bootstrap();
