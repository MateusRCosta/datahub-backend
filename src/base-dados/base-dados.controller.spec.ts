import { BadRequestException, ValidationPipe } from '@nestjs/common';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import fastifyMultipart from '@fastify/multipart';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { TipoCampo } from 'src/common/types/dados.types';
import { BaseDadosController } from './base-dados.controller';
import { BaseDadosService } from './base-dados.service';

type BaseDadosServiceMock = {
  retornaTodos: jest.Mock;
  retornaTodosParaCampanha: jest.Mock;
  retornaPorId: jest.Mock;
  cria: jest.Mock;
  atualiza: jest.Mock;
  exclui: jest.Mock;
};

describe('BaseDadosController', () => {
  let app: NestFastifyApplication;
  let baseDadosService: BaseDadosServiceMock;

  const estrutura = [
    {
      cabecalho: 'email',
      rotulo: 'Email',
      tipo: TipoCampo.EMAIL,
      obrigatorio: true,
    },
  ];

  beforeEach(async () => {
    baseDadosService = {
      retornaTodos: jest.fn(),
      retornaTodosParaCampanha: jest.fn(),
      retornaPorId: jest.fn(),
      cria: jest.fn(),
      atualiza: jest.fn(),
      exclui: jest.fn(),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [BaseDadosController],
      providers: [
        {
          provide: BaseDadosService,
          useValue: baseDadosService,
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.register(fastifyMultipart);
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterEach(async () => {
    await app.close();
    jest.clearAllMocks();
  });

  it('GET /bases-dados retorna bases paginadas', async () => {
    const responseBody = {
      data: [
        {
          id: 1,
          nome: 'clientes',
          estrutura,
          integracao: null,
          usuario: { nome: 'Admin' },
          _count: { clientes: 2 },
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
    baseDadosService.retornaTodos.mockResolvedValue(responseBody);

    await request(app.getHttpServer())
      .get('/bases-dados')
      .query({
        id: '1',
        nome: 'clientes',
        usuarioId: '10',
        integracaoId: '20',
        page: '1',
        limit: '10',
      })
      .expect(200)
      .expect(responseBody);

    expect(baseDadosService.retornaTodos).toHaveBeenCalledTimes(1);
    const [query] = baseDadosService.retornaTodos.mock.calls[0] as [
      {
        id?: number;
        nome?: string;
        usuarioId?: number;
        integracaoId?: number;
        page?: number;
        limit?: number;
      },
    ];
    expect(query).toMatchObject({
      id: 1,
      nome: 'clientes',
      usuarioId: 10,
      integracaoId: 20,
      page: 1,
      limit: 10,
    });
  });

  it('GET /bases-dados/campos retorna bases com campos para campanha', async () => {
    const responseBody = {
      data: [
        {
          id: 1,
          nome: 'clientes',
          campos: [{ campo: 'email', rotulo: 'Email' }],
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
    baseDadosService.retornaTodosParaCampanha.mockResolvedValue(responseBody);

    await request(app.getHttpServer())
      .get('/bases-dados/campos')
      .query({ nome: 'clientes' })
      .expect(200)
      .expect(responseBody);

    expect(baseDadosService.retornaTodosParaCampanha).toHaveBeenCalledTimes(1);
  });

  it('GET /bases-dados/:id retorna base por id', async () => {
    const responseBody = {
      id: 1,
      nome: 'clientes',
      estrutura,
      integracao: null,
      usuario: { nome: 'Admin' },
      _count: { clientes: 2 },
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
    };
    baseDadosService.retornaPorId.mockResolvedValue(responseBody);

    await request(app.getHttpServer())
      .get('/bases-dados/1')
      .expect(200)
      .expect(responseBody);

    expect(baseDadosService.retornaPorId).toHaveBeenCalledWith(1);
  });

  it('GET /bases-dados/:id retorna 400 quando id nao e numerico', async () => {
    await request(app.getHttpServer()).get('/bases-dados/abc').expect(400);

    expect(baseDadosService.retornaPorId).not.toHaveBeenCalled();
  });

  it('POST /bases-dados cria base com csv multipart', async () => {
    baseDadosService.cria.mockResolvedValue({ id: 1 });

    await request(app.getHttpServer())
      .post('/bases-dados')
      .field('nome', 'clientes')
      .field('estrutura', JSON.stringify(estrutura))
      .attach('file', Buffer.from('email\njoao@example.com'), {
        filename: 'clientes.csv',
        contentType: 'text/csv',
      })
      .expect(201)
      .expect({ id: 1 });

    expect(baseDadosService.cria).toHaveBeenCalledTimes(1);
    const [dto, buffer, usuarioId] = baseDadosService.cria.mock.calls[0] as [
      {
        nome: string;
        estrutura: typeof estrutura;
      },
      Buffer,
      number | undefined,
    ];
    expect(dto).toEqual({
      nome: 'clientes',
      estrutura,
    });
    expect(buffer.toString('utf-8')).toBe('email\njoao@example.com');
    expect(usuarioId).toBeUndefined();
  });

  it('POST /bases-dados retorna 400 quando arquivo esta ausente', async () => {
    await request(app.getHttpServer())
      .post('/bases-dados')
      .field('nome', 'clientes')
      .field('estrutura', JSON.stringify(estrutura))
      .expect(400);

    expect(baseDadosService.cria).not.toHaveBeenCalled();
  });

  it('POST /bases-dados retorna 400 quando mimetype nao e csv', async () => {
    await request(app.getHttpServer())
      .post('/bases-dados')
      .field('nome', 'clientes')
      .field('estrutura', JSON.stringify(estrutura))
      .attach('file', Buffer.from('email\njoao@example.com'), {
        filename: 'clientes.txt',
        contentType: 'text/plain',
      })
      .expect(400);

    expect(baseDadosService.cria).not.toHaveBeenCalled();
  });

  it('POST /bases-dados retorna 400 quando estrutura nao e json valido', async () => {
    await request(app.getHttpServer())
      .post('/bases-dados')
      .field('nome', 'clientes')
      .field('estrutura', 'json-invalido')
      .attach('file', Buffer.from('email\njoao@example.com'), {
        filename: 'clientes.csv',
        contentType: 'text/csv',
      })
      .expect(400);

    expect(baseDadosService.cria).not.toHaveBeenCalled();
  });

  it('PUT /bases-dados/:id atualiza base e retorna 204', async () => {
    baseDadosService.atualiza.mockResolvedValue({
      id: 1,
      revalidacaoClientes: 0,
      tipoFoiAlterado: false,
    });

    await request(app.getHttpServer())
      .put('/bases-dados/1')
      .send({ nome: 'clientes 2' })
      .expect(204)
      .expect('');

    expect(baseDadosService.atualiza).toHaveBeenCalledWith(1, {
      nome: 'clientes 2',
    });
  });

  it('PUT /bases-dados/:id retorna 400 quando body e invalido', async () => {
    await request(app.getHttpServer())
      .put('/bases-dados/1')
      .send({
        estrutura: [
          {
            cabecalho: 'email',
            obrigatorio: 'sim',
          },
        ],
      })
      .expect(400);

    expect(baseDadosService.atualiza).not.toHaveBeenCalled();
  });

  it('DELETE /bases-dados/:id exclui base e retorna 204', async () => {
    baseDadosService.exclui.mockResolvedValue({
      id: 1,
      clientesSoftDeleted: 2,
    });

    await request(app.getHttpServer())
      .delete('/bases-dados/1')
      .expect(204)
      .expect('');

    expect(baseDadosService.exclui).toHaveBeenCalledWith(1);
  });

  it('DELETE /bases-dados/:id retorna 400 quando id nao e numerico', async () => {
    await request(app.getHttpServer()).delete('/bases-dados/abc').expect(400);

    expect(baseDadosService.exclui).not.toHaveBeenCalled();
  });

  it('propaga BadRequestException gerada pelo service', async () => {
    baseDadosService.atualiza.mockRejectedValue(
      new BadRequestException('dto invalido'),
    );

    await request(app.getHttpServer())
      .put('/bases-dados/1')
      .send({ nome: 'clientes' })
      .expect(400);
  });
});
