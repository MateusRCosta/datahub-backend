import { ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { ClientesController } from './cliente.controller';
import { ClientesService } from './cliente.service';
import { NestFastifyApplication } from '@nestjs/platform-fastify';

type ClientesServiceMock = {
  retornaTodos: jest.Mock;
  retornaPorId: jest.Mock;
  atualiza: jest.Mock;
  exclui: jest.Mock;
};

describe('ClientesController', () => {
  let app: NestFastifyApplication;
  let clientesService: ClientesServiceMock;

  beforeEach(async () => {
    clientesService = {
      retornaTodos: jest.fn(),
      retornaPorId: jest.fn(),
      atualiza: jest.fn(),
      exclui: jest.fn(),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [ClientesController],
      providers: [
        {
          provide: ClientesService,
          useValue: clientesService,
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
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

  it('GET /clientes retorna clientes paginados', async () => {
    const responseBody = {
      data: [
        {
          id: 1,
          dados: { email: 'joao@example.com' },
          validacao: [],
          baseDeDadosId: 10,
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
    clientesService.retornaTodos.mockResolvedValue(responseBody);

    await request(app.getHttpServer())
      .get('/clientes')
      .query({
        id: '1',
        baseDeDadosId: '10',
        hash: '021fb596db81e6d02bf3d2586ee3981fe519f275c0ac9ca76bbcf2ebb4097d96',
        page: '1',
        limit: '10',
      })
      .expect(200)
      .expect(responseBody);

    expect(clientesService.retornaTodos).toHaveBeenCalledTimes(1);
    const [query] = clientesService.retornaTodos.mock.calls[0] as [
      {
        id?: number;
        baseDeDadosId?: number;
        hash?: string;
        page?: number;
        limit?: number;
      },
    ];
    expect(query).toMatchObject({
      id: 1,
      baseDeDadosId: 10,
      hash: '021fb596db81e6d02bf3d2586ee3981fe519f275c0ac9ca76bbcf2ebb4097d96',
      page: 1,
      limit: 10,
    });
  });

  it('GET /clientes/:id retorna cliente por id', async () => {
    const responseBody = {
      id: 1,
      dados: { email: 'joao@example.com' },
      validacao: [],
      baseDeDadosId: 10,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
    };
    clientesService.retornaPorId.mockResolvedValue(responseBody);

    await request(app.getHttpServer())
      .get('/clientes/1')
      .expect(200)
      .expect(responseBody);

    expect(clientesService.retornaPorId).toHaveBeenCalledWith(1);
  });

  it('GET /clientes/:id retorna 400 quando id nao e numerico', async () => {
    await request(app.getHttpServer()).get('/clientes/abc').expect(400);

    expect(clientesService.retornaPorId).not.toHaveBeenCalled();
  });

  it('PUT /clientes/:id atualiza cliente e retorna 204', async () => {
    clientesService.atualiza.mockResolvedValue({ id: 1 });
    const payload = {
      dados: {
        email: 'joao@example.com',
      },
    };

    await request(app.getHttpServer())
      .put('/clientes/1')
      .send(payload)
      .expect(204)
      .expect('');

    expect(clientesService.atualiza).toHaveBeenCalledWith(1, payload);
  });

  it('PUT /clientes/:id retorna 400 quando body e invalido', async () => {
    await request(app.getHttpServer())
      .put('/clientes/1')
      .send({
        dados: 'valor-invalido',
      })
      .expect(400);

    expect(clientesService.atualiza).not.toHaveBeenCalled();
  });

  it('DELETE /clientes/:id exclui cliente e retorna 204', async () => {
    clientesService.exclui.mockResolvedValue(undefined);

    await request(app.getHttpServer())
      .delete('/clientes/1')
      .expect(204)
      .expect('');

    expect(clientesService.exclui).toHaveBeenCalledWith(1);
  });

  it('DELETE /clientes/:id retorna 400 quando id nao e numerico', async () => {
    await request(app.getHttpServer()).delete('/clientes/abc').expect(400);

    expect(clientesService.exclui).not.toHaveBeenCalled();
  });
});
