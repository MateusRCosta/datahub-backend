import { ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { NextFunction, Request, Response } from 'express';
import request from 'supertest';
import { Payload } from 'src/auth/types/payload';
import { Permissao } from 'src/usuario/interfaces/permissao';
import { QueryView } from './types/view.types';
import { ViewController } from './view.controller';
import { ViewService } from './view.service';
import { NestFastifyApplication } from '@nestjs/platform-fastify';

type ViewServiceMock = {
  retornaTodos: jest.Mock;
  retornaTodosParaCampanha: jest.Mock;
  retornaPorId: jest.Mock;
  executa: jest.Mock;
  executaCsv: jest.Mock;
  cria: jest.Mock;
  atualiza: jest.Mock;
  exclui: jest.Mock;
};

type RequestWithUser = Request & {
  user?: Payload;
};

describe('ViewController', () => {
  let app: NestFastifyApplication;
  let viewService: ViewServiceMock;

  const usuarioAtual: Payload = {
    sub: 99,
    admin: true,
    permissoes: [Permissao.GERENCIAR_VISUALIZACOES],
    sid: 'session-id',
    iat: 1,
    exp: 2,
  };

  const config: QueryView = {
    from: { baseDadosId: 10 },
    select: [
      {
        baseDadosId: 10,
        joinIndex: 0,
        campos: [{ campo: 'email', rotulo: 'Email' }],
      },
    ],
  };

  const createPayload = {
    nome: 'View clientes',
    descricao: 'Clientes ativos',
    config,
  };

  beforeEach(async () => {
    viewService = {
      retornaTodos: jest.fn(),
      retornaTodosParaCampanha: jest.fn(),
      retornaPorId: jest.fn(),
      executa: jest.fn(),
      executaCsv: jest.fn(),
      cria: jest.fn(),
      atualiza: jest.fn(),
      exclui: jest.fn(),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [ViewController],
      providers: [
        {
          provide: ViewService,
          useValue: viewService,
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

  it('GET /views retorna views paginadas', async () => {
    const responseBody = {
      data: [{ id: 1, nome: 'View clientes', usuario: { nome: 'Admin' } }],
      meta: {
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    };
    viewService.retornaTodos.mockResolvedValue(responseBody);

    await request(app.getHttpServer())
      .get('/views')
      .query({ id: '1', nome: 'View', page: '1', limit: '10' })
      .expect(200)
      .expect(responseBody);

    const [query] = viewService.retornaTodos.mock.calls[0] as [
      { id?: number; nome?: string; page?: number; limit?: number },
    ];
    expect(query.id).toBe(1);
    expect(query.nome).toBe('View');
    expect(query.page).toBe(1);
    expect(query.limit).toBe(10);
  });

  it('GET /views/campos retorna views com campos para campanha', async () => {
    const responseBody = {
      data: [
        {
          id: 1,
          nome: 'View clientes',
          campos: [{ baseDadosId: 10, campo: 'email', rotulo: 'Email' }],
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
    viewService.retornaTodosParaCampanha.mockResolvedValue(responseBody);

    await request(app.getHttpServer())
      .get('/views/campos')
      .query({ page: '1', limit: '10' })
      .expect(200)
      .expect(responseBody);

    const [query] = viewService.retornaTodosParaCampanha.mock.calls[0] as [
      { page?: number; limit?: number },
    ];
    expect(query.page).toBe(1);
    expect(query.limit).toBe(10);
  });

  it('GET /views/:id retorna view por id', async () => {
    const responseBody = {
      id: 1,
      nome: 'View clientes',
      descricao: 'Clientes ativos',
      config,
      usuario: { nome: 'Admin' },
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: null,
    };
    viewService.retornaPorId.mockResolvedValue(responseBody);

    await request(app.getHttpServer())
      .get('/views/1')
      .expect(200)
      .expect(responseBody);

    expect(viewService.retornaPorId).toHaveBeenCalledWith(1);
  });

  it('GET /views/:id retorna 400 para id invalido', async () => {
    await request(app.getHttpServer()).get('/views/abc').expect(400);

    expect(viewService.retornaPorId).not.toHaveBeenCalled();
  });

  it('GET /views/:id/executa executa view paginada', async () => {
    const responseBody = {
      data: [{ Email: 'joao@example.com' }],
      meta: {
        page: 2,
        limit: 5,
        total: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: true,
      },
    };
    viewService.executa.mockResolvedValue(responseBody);

    await request(app.getHttpServer())
      .get('/views/1/executa')
      .query({ page: '2', limit: '5' })
      .expect(200)
      .expect(responseBody);

    const [id, query] = viewService.executa.mock.calls[0] as [
      number,
      { page?: number; limit?: number },
    ];
    expect(id).toBe(1);
    expect(query.page).toBe(2);
    expect(query.limit).toBe(5);
  });

  it('GET /views/:id/csv baixa csv da view', async () => {
    viewService.executaCsv.mockResolvedValue(
      'b0-Email,b0-Nome\njoao@example.com,"Joao, Silva"',
    );

    await request(app.getHttpServer())
      .get('/views/1/csv')
      .expect(200)
      .expect('Content-Type', /text\/csv/)
      .expect('Content-Disposition', 'attachment; filename="visualizacao.csv"')
      .expect('b0-Email,b0-Nome\njoao@example.com,"Joao, Silva"');

    expect(viewService.executaCsv).toHaveBeenCalledWith(1);
  });

  it('GET /views/:id/csv retorna 400 para id invalido', async () => {
    await request(app.getHttpServer()).get('/views/abc/csv').expect(400);

    expect(viewService.executaCsv).not.toHaveBeenCalled();
  });

  it('POST /views cria view usando usuario atual', async () => {
    viewService.cria.mockResolvedValue({ id: 1 });

    await request(app.getHttpServer())
      .post('/views')
      .send(createPayload)
      .expect(201)
      .expect({ id: 1 });

    expect(viewService.cria).toHaveBeenCalledTimes(1);
    const [dto, usuarioId] = viewService.cria.mock.calls[0] as [
      typeof createPayload,
      number,
    ];
    expect(dto).toEqual(createPayload);
    expect(usuarioId).toBe(usuarioAtual.sub);
  });

  it('POST /views retorna 400 para body invalido', async () => {
    await request(app.getHttpServer())
      .post('/views')
      .send({
        ...createPayload,
        config: {},
      })
      .expect(400);

    expect(viewService.cria).not.toHaveBeenCalled();
  });

  it('PUT /views/:id atualiza view e retorna 204', async () => {
    viewService.atualiza.mockResolvedValue({ id: 1 });
    const payload = {
      nome: 'View nova',
      descricao: 'Descricao nova',
      config,
    };

    await request(app.getHttpServer())
      .put('/views/1')
      .send(payload)
      .expect(204)
      .expect('');

    expect(viewService.atualiza).toHaveBeenCalledWith(1, payload);
  });

  it('DELETE /views/:id exclui view e retorna 204', async () => {
    viewService.exclui.mockResolvedValue({ id: 1 });

    await request(app.getHttpServer())
      .delete('/views/1')
      .expect(204)
      .expect('');

    expect(viewService.exclui).toHaveBeenCalledWith(1);
  });
});
