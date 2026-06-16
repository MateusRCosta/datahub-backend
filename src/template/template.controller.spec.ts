import { ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { NextFunction, Request, Response } from 'express';
import request from 'supertest';
import { Payload } from 'src/auth/types/payload';
import { PROVEDOR_INTEGRACAO_CAMPANHA } from 'src/integracao-campanha/types/provedor-integracao-campanha.type';
import { Permissao } from 'src/usuario/interfaces/permissao';
import { TemplateController } from './template.controller';
import { TemplateService } from './template.service';
import { BOTAO_ENUM } from './types/template-upchat.types';
import { NestFastifyApplication } from '@nestjs/platform-fastify';

type TemplateServiceMock = {
  retornaTodos: jest.Mock;
  retornaPorId: jest.Mock;
  cria: jest.Mock;
  atualiza: jest.Mock;
  exclui: jest.Mock;
};

type RequestWithUser = Request & {
  user?: Payload;
};

describe('TemplateController', () => {
  let app: NestFastifyApplication;
  let templateService: TemplateServiceMock;

  const usuarioAtual: Payload = {
    sub: 99,
    admin: true,
    permissoes: [Permissao.GERENCIAR_CAMPANHAS],
    sid: 'session-id',
    iat: 1,
    exp: 2,
  };

  const config = {
    id: 10,
    nome: 'Template boas vindas',
    tituloTemplate: 'Boas vindas',
    mensagemTemplate: 'Ola {{nome}}',
    rodapeTemplate: 'Equipe',
    botoes: [
      {
        tipo: BOTAO_ENUM.QUICK_REPLY,
        textoBotao: 'Confirmar',
      },
    ],
  };

  const createPayload = {
    nome: 'Template upchat',
    integracaoCampanhaId: 20,
    provedor: PROVEDOR_INTEGRACAO_CAMPANHA.UPCHAT,
    config,
    quantidadeVars: 1,
  };

  beforeEach(async () => {
    templateService = {
      retornaTodos: jest.fn(),
      retornaPorId: jest.fn(),
      cria: jest.fn(),
      atualiza: jest.fn(),
      exclui: jest.fn(),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [TemplateController],
      providers: [
        {
          provide: TemplateService,
          useValue: templateService,
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

  it('GET /templates retorna templates paginados', async () => {
    const responseBody = {
      data: [
        {
          id: 1,
          nome: 'Template upchat',
          quantidadeVars: 1,
          integracaoCampanha: {
            provedor: PROVEDOR_INTEGRACAO_CAMPANHA.UPCHAT,
            nome: 'Upchat',
          },
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-02T00:00:00.000Z',
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
    templateService.retornaTodos.mockResolvedValue(responseBody);

    await request(app.getHttpServer())
      .get('/templates')
      .query({
        id: '1',
        nome: 'Template',
        provedor: PROVEDOR_INTEGRACAO_CAMPANHA.UPCHAT,
        integracaoCampanhaId: '20',
        page: '1',
        limit: '10',
      })
      .expect(200)
      .expect(responseBody);

    const [query] = templateService.retornaTodos.mock.calls[0] as [
      {
        id?: number;
        nome?: string;
        provedor?: PROVEDOR_INTEGRACAO_CAMPANHA;
        integracaoCampanhaId?: number;
        page?: number;
        limit?: number;
      },
    ];
    expect(query).toMatchObject({
      id: 1,
      nome: 'Template',
      provedor: PROVEDOR_INTEGRACAO_CAMPANHA.UPCHAT,
      integracaoCampanhaId: 20,
      page: 1,
      limit: 10,
    });
  });

  it('GET /templates/:id retorna template por id', async () => {
    const responseBody = {
      id: 1,
      nome: 'Template upchat',
      config,
      quantidadeVars: 1,
      integracaoCampanha: {
        provedor: PROVEDOR_INTEGRACAO_CAMPANHA.UPCHAT,
        nome: 'Upchat',
      },
      usuario: { nome: 'Admin' },
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
    };
    templateService.retornaPorId.mockResolvedValue(responseBody);

    await request(app.getHttpServer())
      .get('/templates/1')
      .expect(200)
      .expect(responseBody);

    expect(templateService.retornaPorId).toHaveBeenCalledWith(1);
  });

  it('GET /templates/:id retorna 400 para id invalido', async () => {
    await request(app.getHttpServer()).get('/templates/abc').expect(400);

    expect(templateService.retornaPorId).not.toHaveBeenCalled();
  });

  it('POST /templates cria template usando usuario atual', async () => {
    templateService.cria.mockResolvedValue({ id: 1 });

    await request(app.getHttpServer())
      .post('/templates')
      .send(createPayload)
      .expect(201)
      .expect({ id: 1 });

    expect(templateService.cria).toHaveBeenCalledWith(
      createPayload,
      usuarioAtual.sub,
    );
  });

  it('POST /templates retorna 400 para body invalido', async () => {
    await request(app.getHttpServer())
      .post('/templates')
      .send({
        ...createPayload,
        quantidadeVars: 2000,
      })
      .expect(400);

    expect(templateService.cria).not.toHaveBeenCalled();
  });

  it('PUT /templates/:id atualiza template e retorna 204', async () => {
    templateService.atualiza.mockResolvedValue({ id: 1 });
    const payload = {
      nome: 'Template novo',
      provedor: PROVEDOR_INTEGRACAO_CAMPANHA.UPCHAT,
      quantidadeVars: 2,
      config,
    };

    await request(app.getHttpServer())
      .put('/templates/1')
      .send(payload)
      .expect(204)
      .expect('');

    expect(templateService.atualiza).toHaveBeenCalledWith(1, payload);
  });

  it('PUT /templates/:id retorna 400 para body invalido', async () => {
    await request(app.getHttpServer())
      .put('/templates/1')
      .send({
        nome: 'Template novo',
      })
      .expect(400);

    expect(templateService.atualiza).not.toHaveBeenCalled();
  });

  it('DELETE /templates/:id exclui template e retorna 204', async () => {
    templateService.exclui.mockResolvedValue({ id: 1 });

    await request(app.getHttpServer())
      .delete('/templates/1')
      .expect(204)
      .expect('');

    expect(templateService.exclui).toHaveBeenCalledWith(1);
  });

  it('DELETE /templates/:id retorna 400 para id invalido', async () => {
    await request(app.getHttpServer()).delete('/templates/abc').expect(400);

    expect(templateService.exclui).not.toHaveBeenCalled();
  });
});
