import { ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { NextFunction, Request, Response } from 'express';
import request from 'supertest';
import { Payload } from 'src/auth/types/payload';
import { TipoCampo } from 'src/base-dados/util/type';
import { Permissao } from 'src/usuario/interfaces/permissao';
import { IntegracaoController } from './integracao.controller';
import { IntegracaoService } from './integracao.service';
import { METODO } from './types/integracao.type';
import { NestFastifyApplication } from '@nestjs/platform-fastify';

type IntegracaoServiceMock = {
  retornaTodos: jest.Mock;
  retornaPorId: jest.Mock;
  cria: jest.Mock;
  atualiza: jest.Mock;
  exclui: jest.Mock;
  atualizaStatus: jest.Mock;
  ativa: jest.Mock;
};

type RequestWithUser = Request & {
  user?: Payload;
};

describe('IntegracaoController', () => {
  let app: NestFastifyApplication;
  let integracaoService: IntegracaoServiceMock;

  const usuarioAtual: Payload = {
    sub: 99,
    admin: true,
    permissoes: [Permissao.GERENCIAR_INTEGRACOES],
    sid: 'session-id',
    iat: 1,
    exp: 2,
  };

  const responseScrap = [
    {
      nome: 'email',
      path: '[n].email',
      tipo: TipoCampo.EMAIL,
      identificador: true,
    },
  ];

  const createPayload = {
    nome: 'Scrapping clientes',
    limitDeRequisicaoPorMin: 10,
    horaExecucao: 4,
    urlScrap: 'https://api.example.com/clientes',
    metodoScrap: METODO.GET,
    responseScrap,
  };

  beforeEach(async () => {
    integracaoService = {
      retornaTodos: jest.fn(),
      retornaPorId: jest.fn(),
      cria: jest.fn(),
      atualiza: jest.fn(),
      exclui: jest.fn(),
      atualizaStatus: jest.fn(),
      ativa: jest.fn(),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [IntegracaoController],
      providers: [
        {
          provide: IntegracaoService,
          useValue: integracaoService,
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

  it('GET /integracoes retorna integracoes paginadas', async () => {
    const responseBody = {
      data: [
        {
          id: 1,
          nome: 'Scrapping clientes',
          usuario: { nome: 'Admin' },
          status: true,
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
    integracaoService.retornaTodos.mockResolvedValue(responseBody);

    await request(app.getHttpServer())
      .get('/integracoes')
      .query({
        id: '1',
        nome: 'Scrapping',
        usuarioId: '99',
        page: '1',
        limit: '10',
      })
      .expect(200)
      .expect(responseBody);

    const [query] = integracaoService.retornaTodos.mock.calls[0] as [
      {
        id?: number;
        nome?: string;
        usuarioId?: number;
        page?: number;
        limit?: number;
      },
    ];
    expect(query).toMatchObject({
      id: 1,
      nome: 'Scrapping',
      usuarioId: 99,
      page: 1,
      limit: 10,
    });
  });

  it('GET /integracoes/:id retorna integracao por id', async () => {
    const responseBody = {
      id: 1,
      nome: 'Scrapping clientes',
      status: true,
    };
    integracaoService.retornaPorId.mockResolvedValue(responseBody);

    await request(app.getHttpServer())
      .get('/integracoes/1')
      .expect(200)
      .expect(responseBody);

    expect(integracaoService.retornaPorId).toHaveBeenCalledWith(1);
  });

  it('POST /integracoes cria integracao usando usuario atual', async () => {
    integracaoService.cria.mockResolvedValue({ id: 1 });

    await request(app.getHttpServer())
      .post('/integracoes')
      .send(createPayload)
      .expect(201)
      .expect({ id: 1 });

    expect(integracaoService.cria).toHaveBeenCalledTimes(1);
    const [dto, idUsuario] = integracaoService.cria.mock.calls[0] as [
      typeof createPayload,
      number,
    ];
    expect(dto).toMatchObject(createPayload);
    expect(idUsuario).toBe(usuarioAtual.sub);
  });

  it('POST /integracoes retorna 400 quando body e invalido', async () => {
    await request(app.getHttpServer())
      .post('/integracoes')
      .send({
        ...createPayload,
        urlScrap: 'url-invalida',
      })
      .expect(400);

    expect(integracaoService.cria).not.toHaveBeenCalled();
  });

  it('PUT /integracoes/:id atualiza integracao e retorna 204', async () => {
    integracaoService.atualiza.mockResolvedValue({ id: 1 });
    const payload = {
      nome: 'Novo nome',
      horaExecucao: 5,
    };

    await request(app.getHttpServer())
      .put('/integracoes/1')
      .send(payload)
      .expect(204)
      .expect('');

    expect(integracaoService.atualiza).toHaveBeenCalledTimes(1);
    const [dto, idUsuario, idIntegracao] = integracaoService.atualiza.mock
      .calls[0] as [typeof payload, number, number];
    expect(dto).toMatchObject(payload);
    expect(idUsuario).toBe(usuarioAtual.sub);
    expect(idIntegracao).toBe(1);
  });

  it('DELETE /integracoes/:id exclui integracao e retorna 204', async () => {
    integracaoService.exclui.mockResolvedValue({ id: 1 });

    await request(app.getHttpServer())
      .delete('/integracoes/1')
      .expect(204)
      .expect('');

    expect(integracaoService.exclui).toHaveBeenCalledWith(1, usuarioAtual.sub);
  });

  it('PATCH /integracoes/:id/status atualiza status e retorna 204', async () => {
    integracaoService.atualizaStatus.mockResolvedValue({ id: 1 });

    await request(app.getHttpServer())
      .patch('/integracoes/1/status')
      .send({ status: true })
      .expect(204)
      .expect('');

    expect(integracaoService.atualizaStatus).toHaveBeenCalledWith(
      1,
      { status: true },
      usuarioAtual.sub,
    );
  });

  it('PATCH /integracoes/:id/ativar ativa integracao e retorna 204', async () => {
    integracaoService.ativa.mockResolvedValue(undefined);

    await request(app.getHttpServer())
      .patch('/integracoes/1/ativar')
      .expect(204)
      .expect('');

    expect(integracaoService.ativa).toHaveBeenCalledWith(1, usuarioAtual.sub);
  });
});
