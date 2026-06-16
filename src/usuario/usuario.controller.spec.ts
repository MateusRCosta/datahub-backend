import { ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { NextFunction, Request, Response } from 'express';
import request from 'supertest';
import { Payload } from 'src/auth/types/payload';
import { UsuariosController } from './usuario.controller';
import { UsuariosService } from './usuario.service';
import { Permissao } from './interfaces/permissao';
import { NestFastifyApplication } from '@nestjs/platform-fastify';

type UsuariosServiceMock = {
  cria: jest.Mock;
  retornaTodos: jest.Mock;
  retornaPorId: jest.Mock;
  atualiza: jest.Mock;
  atualizaStatus: jest.Mock;
  exclui: jest.Mock;
};

type RequestWithUser = Request & {
  user?: Payload;
};

describe('UsuariosController', () => {
  let app: NestFastifyApplication;
  let usuariosService: UsuariosServiceMock;

  const usuarioAtual: Payload = {
    sub: 99,
    admin: true,
    permissoes: [],
    sid: 'session-id',
    iat: 1,
    exp: 2,
  };

  const validPayload = {
    nome: 'Joao Silva',
    email: 'joao@example.com',
    senha: 'Password@123',
    admin: false,
    permissoes: [Permissao.GERENCIAR_BASE_DADOS],
  };

  beforeEach(async () => {
    usuariosService = {
      cria: jest.fn(),
      retornaTodos: jest.fn(),
      retornaPorId: jest.fn(),
      atualiza: jest.fn(),
      atualizaStatus: jest.fn(),
      exclui: jest.fn(),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [UsuariosController],
      providers: [
        {
          provide: UsuariosService,
          useValue: usuariosService,
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

  it('POST /usuarios cria usuario e retorna 201 sem body', async () => {
    usuariosService.cria.mockResolvedValue({ id: 10 });

    await request(app.getHttpServer())
      .post('/usuarios')
      .send(validPayload)
      .expect(201)
      .expect('');

    expect(usuariosService.cria).toHaveBeenCalledTimes(1);
    expect(usuariosService.cria).toHaveBeenCalledWith(validPayload);
  });

  it('POST /usuarios retorna 400 quando o body e invalido', async () => {
    await request(app.getHttpServer())
      .post('/usuarios')
      .send({
        ...validPayload,
        email: 'email-invalido',
        senha: 'curta',
      })
      .expect(400);

    expect(usuariosService.cria).not.toHaveBeenCalled();
  });

  it('GET /usuarios retorna lista paginada e transforma query params', async () => {
    const response = {
      data: [
        {
          id: 10,
          nome: 'Joao Silva',
          email: 'joao@example.com',
          admin: false,
          ativo: true,
          permissoes: [Permissao.GERENCIAR_BASE_DADOS],
        },
      ],
      meta: {
        total: 1,
        page: 2,
        limit: 5,
        totalPages: 1,
      },
    };
    usuariosService.retornaTodos.mockResolvedValue(response);

    await request(app.getHttpServer())
      .get('/usuarios')
      .query({
        page: '2',
        limit: '5',
        id: '10',
        nome: 'Joao',
        email: 'joao@example.com',
        admin: 'false',
        ativo: 'false',
        order: 'asc',
        orderBy: 'nome',
      })
      .expect(200)
      .expect(response);

    expect(usuariosService.retornaTodos).toHaveBeenCalledTimes(1);
    expect(usuariosService.retornaTodos).toHaveBeenCalledWith(
      expect.objectContaining({
        page: 2,
        limit: 5,
        id: 10,
        nome: 'Joao',
        email: 'joao@example.com',
        admin: false,
        ativo: false,
        order: 'asc',
        orderBy: 'nome',
      }),
    );
  });

  it('GET /usuarios/:id retorna usuario por id', async () => {
    const response = {
      id: 10,
      nome: 'Joao Silva',
      email: 'joao@example.com',
      admin: false,
      permissoes: [Permissao.GERENCIAR_BASE_DADOS],
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    usuariosService.retornaPorId.mockResolvedValue(response);

    await request(app.getHttpServer())
      .get('/usuarios/10')
      .expect(200)
      .expect(response);

    expect(usuariosService.retornaPorId).toHaveBeenCalledTimes(1);
    expect(usuariosService.retornaPorId).toHaveBeenCalledWith(10);
  });

  it('GET /usuarios/:id retorna 400 quando id nao e numerico', async () => {
    await request(app.getHttpServer()).get('/usuarios/abc').expect(400);

    expect(usuariosService.retornaPorId).not.toHaveBeenCalled();
  });

  it('PUT /usuarios/:id atualiza usuario e retorna 204', async () => {
    usuariosService.atualiza.mockResolvedValue({ id: 10 });

    await request(app.getHttpServer())
      .put('/usuarios/10')
      .send({
        nome: 'Maria Silva',
        senha: 'Password@123',
        admin: true,
        permissoes: [Permissao.GERENCIAR_CAMPANHAS],
      })
      .expect(204)
      .expect('');

    expect(usuariosService.atualiza).toHaveBeenCalledTimes(1);
    expect(usuariosService.atualiza).toHaveBeenCalledWith(
      expect.objectContaining({
        nome: 'Maria Silva',
        senha: 'Password@123',
        admin: true,
        permissoes: [Permissao.GERENCIAR_CAMPANHAS],
      }),
      10,
    );
  });

  it('PUT /usuarios/:id retorna 400 quando o body e invalido', async () => {
    await request(app.getHttpServer())
      .put('/usuarios/10')
      .send({
        senha: 'curta',
      })
      .expect(400);

    expect(usuariosService.atualiza).not.toHaveBeenCalled();
  });

  it('PATCH /usuarios/:id/status atualiza status e retorna 204', async () => {
    usuariosService.atualizaStatus.mockResolvedValue(undefined);

    await request(app.getHttpServer())
      .patch('/usuarios/10/status')
      .send({ status: false })
      .expect(204)
      .expect('');

    expect(usuariosService.atualizaStatus).toHaveBeenCalledTimes(1);
    expect(usuariosService.atualizaStatus).toHaveBeenCalledWith(
      10,
      expect.objectContaining({ status: false }),
      usuarioAtual.sub,
    );
  });

  it('PATCH /usuarios/:id/status retorna 400 quando id nao e numerico', async () => {
    await request(app.getHttpServer())
      .patch('/usuarios/abc/status')
      .send({ status: false })
      .expect(400);

    expect(usuariosService.atualizaStatus).not.toHaveBeenCalled();
  });

  it('DELETE /usuarios/:id exclui usuario e retorna 204', async () => {
    usuariosService.exclui.mockResolvedValue(undefined);

    await request(app.getHttpServer())
      .delete('/usuarios/10')
      .expect(204)
      .expect('');

    expect(usuariosService.exclui).toHaveBeenCalledTimes(1);
    expect(usuariosService.exclui).toHaveBeenCalledWith(10, usuarioAtual.sub);
  });

  it('DELETE /usuarios/:id retorna 400 quando id nao e numerico', async () => {
    await request(app.getHttpServer()).delete('/usuarios/abc').expect(400);

    expect(usuariosService.exclui).not.toHaveBeenCalled();
  });
});
