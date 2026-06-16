import { ValidationPipe } from '@nestjs/common';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { Test, TestingModule } from '@nestjs/testing';
import fastifyCookie from '@fastify/cookie';
import request from 'supertest';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { Permissao } from '../usuario/interfaces/permissao';

type AuthServiceMock = {
  login: jest.Mock;
  refresh: jest.Mock;
  me: jest.Mock;
  alteraSenha: jest.Mock;
  logout: jest.Mock;
};

describe('AuthController', () => {
  let app: NestFastifyApplication;
  let authService: AuthServiceMock;

  const loginPayload = {
    email: 'joao@example.com',
    senha: 'Password@123',
  };

  beforeEach(async () => {
    authService = {
      login: jest.fn(),
      refresh: jest.fn(),
      me: jest.fn(),
      alteraSenha: jest.fn(),
      logout: jest.fn(),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: authService,
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
    await app.register(fastifyCookie, {
      secret: 'cookie-secret',
    });
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterEach(async () => {
    await app.close();
    jest.clearAllMocks();
  });

  it('POST /auth/login autentica e define cookies', async () => {
    authService.login.mockResolvedValue({
      id: 10,
      admin: false,
      permissoes: [Permissao.GERENCIAR_BASE_DADOS],
      refreshToken: 'refresh-token',
      refreshTokenExpiresAt: new Date('2026-01-01T00:00:00.000Z'),
      accessToken: 'access-token',
      accessTokenExpiresAt: new Date('2026-01-01T01:00:00.000Z'),
    });

    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .set('User-Agent', 'jest')
      .send(loginPayload)
      .expect(201)
      .expect('');

    expect(authService.login).toHaveBeenCalledTimes(1);
    expect(authService.login).toHaveBeenCalledTimes(1);
    const [loginDto, metadata] = authService.login.mock.calls[0] as [
      typeof loginPayload,
      {
        ip?: string;
        userAgent?: string;
      },
    ];
    expect(loginDto).toEqual(loginPayload);
    expect(metadata.userAgent).toBe('jest');
    expect(response.headers['set-cookie']).toEqual(
      expect.arrayContaining([
        expect.stringContaining('refreshToken=refresh-token'),
        expect.stringContaining('accessToken=access-token'),
      ]),
    );
  });

  it('POST /auth/login retorna 400 quando body e invalido', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'email-invalido',
        senha: '',
      })
      .expect(400);

    expect(authService.login).not.toHaveBeenCalled();
  });

  it('PATCH /auth/refresh atualiza access token quando refresh cookie e valido', async () => {
    authService.refresh.mockResolvedValue({
      accessToken: 'new-access-token',
      accessTokenExpiresAt: new Date('2026-01-01T01:00:00.000Z'),
      user: {
        id: 10,
        admin: false,
        permissoes: [Permissao.GERENCIAR_BASE_DADOS],
      },
    });

    const response = await request(app.getHttpServer())
      .patch('/auth/refresh')
      .set('Cookie', 'refreshToken=refresh-token')
      .expect(200)
      .expect('');

    expect(authService.refresh).toHaveBeenCalledWith('refresh-token');
    expect(response.headers['set-cookie']).toEqual(
      expect.arrayContaining([
        expect.stringContaining('accessToken=new-access-token'),
      ]),
    );
  });

  it('PATCH /auth/refresh retorna 401 quando service falha', async () => {
    authService.refresh.mockRejectedValue(new Error('invalid refresh'));

    await request(app.getHttpServer())
      .patch('/auth/refresh')
      .set('Cookie', 'refreshToken=refresh-token')
      .expect(401);
  });

  it('GET /auth/me retorna usuario autenticado', async () => {
    const responseBody = {
      id: 10,
      nome: 'Joao Silva',
      email: 'joao@example.com',
      admin: false,
      permissoes: [Permissao.GERENCIAR_BASE_DADOS],
    };
    authService.me.mockResolvedValue(responseBody);

    await request(app.getHttpServer())
      .get('/auth/me')
      .set('Cookie', 'accessToken=access-token')
      .expect(200)
      .expect(responseBody);

    expect(authService.me).toHaveBeenCalledWith('access-token');
  });

  it('PATCH /auth/altera-senha altera senha e retorna 204', async () => {
    authService.alteraSenha.mockResolvedValue(undefined);
    const payload = {
      antigaSenha: 'Password@123',
      novaSenha: 'Password@456',
    };

    await request(app.getHttpServer())
      .patch('/auth/altera-senha')
      .set('Cookie', 'accessToken=access-token')
      .send(payload)
      .expect(204)
      .expect('');

    expect(authService.alteraSenha).toHaveBeenCalledWith(
      'access-token',
      payload,
    );
  });

  it('PATCH /auth/altera-senha retorna 400 quando body e invalido', async () => {
    await request(app.getHttpServer())
      .patch('/auth/altera-senha')
      .set('Cookie', 'accessToken=access-token')
      .send({
        antigaSenha: 'Password@123',
        novaSenha: 'curta',
      })
      .expect(400);

    expect(authService.alteraSenha).not.toHaveBeenCalled();
  });

  it('POST /auth/logout limpa cookies e retorna mensagem', async () => {
    authService.logout.mockResolvedValue({ success: true });

    const response = await request(app.getHttpServer())
      .post('/auth/logout')
      .set('Cookie', 'refreshToken=refresh-token; accessToken=access-token')
      .expect(201)
      .expect({ message: 'Logout successful' });

    expect(authService.logout).toHaveBeenCalledWith('refresh-token');
    expect(response.headers['set-cookie']).toEqual(
      expect.arrayContaining([
        expect.stringContaining('refreshToken=;'),
        expect.stringContaining('accessToken=;'),
      ]),
    );
  });
});
