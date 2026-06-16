import { ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { NextFunction, Request, Response } from 'express';
import request from 'supertest';
import { Payload } from 'src/auth/types/payload';
import { Permissao } from 'src/usuario/interfaces/permissao';
import { CampanhaController } from './campanha.controller';
import { CampanhaService } from './campanha.service';
import { ClienteCampanhaService } from './cliente-campanha.service';
import { STATUS_CAMPANHA } from './types/campanha.type';
import { STATUS_CLIENTE_CAMPANHA } from './types/cliente-campanha.type';
import { NestFastifyApplication } from '@nestjs/platform-fastify';

type CampanhaServiceMock = {
  retornaTodos: jest.Mock;
  retornaPorId: jest.Mock;
  cria: jest.Mock;
  atualiza: jest.Mock;
  atualizaStatus: jest.Mock;
  exclui: jest.Mock;
};

type ClienteCampanhaServiceMock = {
  findClientes: jest.Mock;
};

type RequestWithUser = Request & {
  user?: Payload;
};

describe('CampanhaController', () => {
  let app: NestFastifyApplication;
  let campanhaService: CampanhaServiceMock;
  let clienteCampanhaService: ClienteCampanhaServiceMock;

  const usuarioAtual: Payload = {
    sub: 99,
    admin: true,
    permissoes: [Permissao.GERENCIAR_CAMPANHAS],
    sid: 'session-id',
    iat: 1,
    exp: 2,
  };

  const createPayload = {
    nome: 'Campanha clientes',
    scheduledAt: '2099-01-01T00:00:00.000Z',
    templateId: 1,
    baseDadosId: 10,
    contatoCampo: { valor: 'telefone' },
    vars: [{ variavel: 'nomeCliente', valor: '#nome' }],
  };

  beforeEach(async () => {
    campanhaService = {
      retornaTodos: jest.fn(),
      retornaPorId: jest.fn(),
      cria: jest.fn(),
      atualiza: jest.fn(),
      atualizaStatus: jest.fn(),
      exclui: jest.fn(),
    };
    clienteCampanhaService = {
      findClientes: jest.fn(),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [CampanhaController],
      providers: [
        { provide: CampanhaService, useValue: campanhaService },
        { provide: ClienteCampanhaService, useValue: clienteCampanhaService },
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

  it('GET /campanhas retorna campanhas paginadas', async () => {
    const responseBody = {
      data: [
        {
          id: 1,
          nome: 'Campanha clientes',
          status: STATUS_CAMPANHA.PENDENTE,
          scheduledAt: '2099-01-01T00:00:00.000Z',
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
    campanhaService.retornaTodos.mockResolvedValue(responseBody);

    await request(app.getHttpServer())
      .get('/campanhas')
      .query({
        id: '1',
        nome: 'Campanha',
        status: STATUS_CAMPANHA.PENDENTE,
        templateId: '1',
        viewId: '2',
        usuarioId: '99',
        page: '1',
        limit: '10',
      })
      .expect(200)
      .expect(responseBody);

    const [query] = campanhaService.retornaTodos.mock.calls[0] as [
      {
        id?: number;
        nome?: string;
        status?: STATUS_CAMPANHA;
        templateId?: number;
        viewId?: number;
        usuarioId?: number;
        page?: number;
        limit?: number;
      },
    ];
    expect(query.id).toBe(1);
    expect(query.nome).toBe('Campanha');
    expect(query.status).toBe(STATUS_CAMPANHA.PENDENTE);
    expect(query.templateId).toBe(1);
    expect(query.viewId).toBe(2);
    expect(query.usuarioId).toBe(99);
    expect(query.page).toBe(1);
    expect(query.limit).toBe(10);
  });

  it('GET /campanhas/:id retorna campanha por id', async () => {
    const responseBody = {
      id: 1,
      nome: 'Campanha clientes',
      status: STATUS_CAMPANHA.PENDENTE,
    };
    campanhaService.retornaPorId.mockResolvedValue(responseBody);

    await request(app.getHttpServer())
      .get('/campanhas/1')
      .expect(200)
      .expect(responseBody);

    expect(campanhaService.retornaPorId).toHaveBeenCalledWith(1);
  });

  it('GET /campanhas/:id/clientes retorna clientes da campanha', async () => {
    const responseBody = {
      data: [
        {
          id: 1,
          status: STATUS_CLIENTE_CAMPANHA.PENDENTE,
          clienteId: 10,
          cliente: { id: 10, dados: { nome: 'Joao' } },
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
    clienteCampanhaService.findClientes.mockResolvedValue(responseBody);

    await request(app.getHttpServer())
      .get('/campanhas/1/clientes')
      .query({
        clienteId: '10',
        status: STATUS_CLIENTE_CAMPANHA.PENDENTE,
        page: '1',
        limit: '10',
      })
      .expect(200)
      .expect(responseBody);

    const [campanhaId, query] = clienteCampanhaService.findClientes.mock
      .calls[0] as [
      number,
      {
        clienteId?: number;
        status?: STATUS_CLIENTE_CAMPANHA;
        page?: number;
        limit?: number;
      },
    ];
    expect(campanhaId).toBe(1);
    expect(query.clienteId).toBe(10);
    expect(query.status).toBe(STATUS_CLIENTE_CAMPANHA.PENDENTE);
    expect(query.page).toBe(1);
    expect(query.limit).toBe(10);
  });

  it('POST /campanhas cria campanha usando usuario atual', async () => {
    campanhaService.cria.mockResolvedValue({ id: 1 });

    await request(app.getHttpServer())
      .post('/campanhas')
      .send(createPayload)
      .expect(201)
      .expect({ id: 1 });

    const [dto, usuarioId] = campanhaService.cria.mock.calls[0] as [
      typeof createPayload,
      number,
    ];
    expect(dto.nome).toBe(createPayload.nome);
    expect(dto.scheduledAt).toBeInstanceOf(Date);
    expect(dto.templateId).toBe(createPayload.templateId);
    expect(usuarioId).toBe(usuarioAtual.sub);
  });

  it('POST /campanhas retorna 400 para body invalido', async () => {
    await request(app.getHttpServer())
      .post('/campanhas')
      .send({
        ...createPayload,
        contatoCampo: {},
      })
      .expect(400);

    expect(campanhaService.cria).not.toHaveBeenCalled();
  });

  it('PUT /campanhas/:id atualiza campanha e retorna 204', async () => {
    campanhaService.atualiza.mockResolvedValue({ id: 1 });
    const payload = {
      nome: 'Campanha nova',
      scheduledAt: '2099-02-01T00:00:00.000Z',
    };

    await request(app.getHttpServer())
      .put('/campanhas/1')
      .send(payload)
      .expect(204)
      .expect('');

    const [id, dto] = campanhaService.atualiza.mock.calls[0] as [
      number,
      { nome?: string; scheduledAt?: Date },
    ];
    expect(id).toBe(1);
    expect(dto.nome).toBe(payload.nome);
    expect(dto.scheduledAt).toBeInstanceOf(Date);
  });

  it('PATCH /campanhas/:id/status atualiza status e retorna 204', async () => {
    campanhaService.atualizaStatus.mockResolvedValue({ id: 1 });

    await request(app.getHttpServer())
      .patch('/campanhas/1/status')
      .send({ status: STATUS_CAMPANHA.CANCELADA })
      .expect(204)
      .expect('');

    expect(campanhaService.atualizaStatus).toHaveBeenCalledWith(
      1,
      STATUS_CAMPANHA.CANCELADA,
    );
  });

  it('DELETE /campanhas/:id exclui campanha e retorna 204', async () => {
    campanhaService.exclui.mockResolvedValue({ id: 1 });

    await request(app.getHttpServer())
      .delete('/campanhas/1')
      .expect(204)
      .expect('');

    expect(campanhaService.exclui).toHaveBeenCalledWith(1);
  });
});
