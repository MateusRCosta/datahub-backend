import { ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { NextFunction, Request, Response } from 'express';
import request from 'supertest';
import { Payload } from 'src/auth/types/payload';
import { Permissao } from 'src/usuario/interfaces/permissao';
import { IntegracaoCampanhaController } from './integracao-campanha.controller';
import { IntegracaoCampanhaService } from './integracao-campanha.service';
import { PROVEDOR_INTEGRACAO_CAMPANHA } from './types/provedor-integracao-campanha.type';
import { NestFastifyApplication } from '@nestjs/platform-fastify';

type IntegracaoCampanhaServiceMock = {
  retornaTodos: jest.Mock;
  retornaTodosMinimizados: jest.Mock;
  retornaPorId: jest.Mock;
  cria: jest.Mock;
  atualiza: jest.Mock;
  atualizaStatus: jest.Mock;
  exclui: jest.Mock;
};

type RequestWithUser = Request & {
  user?: Payload;
};

describe('IntegracaoCampanhaController', () => {
  let app: NestFastifyApplication;
  let integracaoCampanhaService: IntegracaoCampanhaServiceMock;

  const usuarioAtual: Payload = {
    sub: 99,
    admin: true,
    permissoes: [Permissao.GERENCIAR_INTEGRACOES],
    sid: 'session-id',
    iat: 1,
    exp: 2,
  };

  const upchatConfig = {
    url: 'https://api.example.com',
    queueId: 1,
    apiKey: 'api-key',
  };

  const createPayload = {
    nome: 'Upchat',
    provedor: PROVEDOR_INTEGRACAO_CAMPANHA.UPCHAT,
    config: upchatConfig,
  };

  beforeEach(async () => {
    integracaoCampanhaService = {
      retornaTodos: jest.fn(),
      retornaTodosMinimizados: jest.fn(),
      retornaPorId: jest.fn(),
      cria: jest.fn(),
      atualiza: jest.fn(),
      atualizaStatus: jest.fn(),
      exclui: jest.fn(),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [IntegracaoCampanhaController],
      providers: [
        {
          provide: IntegracaoCampanhaService,
          useValue: integracaoCampanhaService,
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use((req: RequestWithUser, _res: Response, next: NextFunction) => {
      req.user = usuarioAtual;
      next();
    });
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    jest.clearAllMocks();
  });

  it('GET /integracoes-campanhas retorna integracoes paginadas', async () => {
    const responseBody = {
      data: [
        {
          id: 1,
          nome: 'Upchat',
          provedor: PROVEDOR_INTEGRACAO_CAMPANHA.UPCHAT,
          status: true,
          usuario: { nome: 'Admin' },
        },
      ],
      meta: {
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    };
    integracaoCampanhaService.retornaTodos.mockResolvedValue(responseBody);

    await request(app.getHttpServer())
      .get('/integracoes-campanhas')
      .query({
        id: '1',
        nome: 'Upchat',
        provedor: PROVEDOR_INTEGRACAO_CAMPANHA.UPCHAT,
        status: 'true',
        page: '1',
        limit: '10',
      })
      .expect(200)
      .expect(responseBody);

    const [query] = integracaoCampanhaService.retornaTodos.mock.calls[0] as [
      {
        id?: number;
        nome?: string;
        provedor?: PROVEDOR_INTEGRACAO_CAMPANHA;
        status?: boolean;
        page?: number;
        limit?: number;
      },
    ];
    expect(query).toMatchObject({
      id: 1,
      nome: 'Upchat',
      provedor: PROVEDOR_INTEGRACAO_CAMPANHA.UPCHAT,
      status: true,
      page: 1,
      limit: 10,
    });
  });

  it('GET /integracoes-campanhas/templates retorna minimizados', async () => {
    const responseBody = {
      data: [
        {
          id: 1,
          nome: 'Upchat',
          provedor: PROVEDOR_INTEGRACAO_CAMPANHA.UPCHAT,
          status: true,
        },
      ],
      meta: {
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    };
    integracaoCampanhaService.retornaTodosMinimizados.mockResolvedValue(
      responseBody,
    );

    await request(app.getHttpServer())
      .get('/integracoes-campanhas/templates')
      .query({ provedor: PROVEDOR_INTEGRACAO_CAMPANHA.UPCHAT })
      .expect(200)
      .expect(responseBody);

    expect(
      integracaoCampanhaService.retornaTodosMinimizados,
    ).toHaveBeenCalledTimes(1);
  });

  it('GET /integracoes-campanhas/:id retorna por id', async () => {
    const responseBody = {
      id: 1,
      nome: 'Upchat',
      status: true,
      provedor: PROVEDOR_INTEGRACAO_CAMPANHA.UPCHAT,
      config: upchatConfig,
    };
    integracaoCampanhaService.retornaPorId.mockResolvedValue(responseBody);

    await request(app.getHttpServer())
      .get('/integracoes-campanhas/1')
      .expect(200)
      .expect(responseBody);

    expect(integracaoCampanhaService.retornaPorId).toHaveBeenCalledWith(1);
  });

  it('GET /integracoes-campanhas/:id retorna 400 para id invalido', async () => {
    await request(app.getHttpServer())
      .get('/integracoes-campanhas/abc')
      .expect(400);

    expect(integracaoCampanhaService.retornaPorId).not.toHaveBeenCalled();
  });

  it('POST /integracoes-campanhas cria usando usuario atual', async () => {
    integracaoCampanhaService.cria.mockResolvedValue({ id: 1 });

    await request(app.getHttpServer())
      .post('/integracoes-campanhas')
      .send(createPayload)
      .expect(201)
      .expect({ id: 1 });

    expect(integracaoCampanhaService.cria).toHaveBeenCalledWith(
      createPayload,
      usuarioAtual.sub,
    );
  });

  it('POST /integracoes-campanhas retorna 400 para body invalido', async () => {
    await request(app.getHttpServer())
      .post('/integracoes-campanhas')
      .send({
        ...createPayload,
        config: {
          ...upchatConfig,
          url: 'url-invalida',
        },
      })
      .expect(400);

    expect(integracaoCampanhaService.cria).not.toHaveBeenCalled();
  });

  it('PUT /integracoes-campanhas/:id atualiza e retorna 204', async () => {
    integracaoCampanhaService.atualiza.mockResolvedValue(undefined);
    const payload = {
      nome: 'Upchat novo',
      provedor: PROVEDOR_INTEGRACAO_CAMPANHA.UPCHAT,
      config: upchatConfig,
    };

    await request(app.getHttpServer())
      .put('/integracoes-campanhas/1')
      .send(payload)
      .expect(204)
      .expect('');

    expect(integracaoCampanhaService.atualiza).toHaveBeenCalledWith(1, payload);
  });

  it('PATCH /integracoes-campanhas/:id/status atualiza status e retorna 204', async () => {
    integracaoCampanhaService.atualizaStatus.mockResolvedValue({ id: 1 });

    await request(app.getHttpServer())
      .patch('/integracoes-campanhas/1/status')
      .send({ status: false })
      .expect(204)
      .expect('');

    expect(integracaoCampanhaService.atualizaStatus).toHaveBeenCalledWith(
      1,
      false,
    );
  });

  it('DELETE /integracoes-campanhas/:id exclui e retorna 204', async () => {
    integracaoCampanhaService.exclui.mockResolvedValue({ id: 1 });

    await request(app.getHttpServer())
      .delete('/integracoes-campanhas/1')
      .expect(204)
      .expect('');

    expect(integracaoCampanhaService.exclui).toHaveBeenCalledWith(1);
  });
});
