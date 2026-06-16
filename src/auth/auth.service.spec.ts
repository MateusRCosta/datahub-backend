import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { verifyPassword } from '../config/argon';
import { PrismaService } from '../config/prisma.service';
import { UsuariosService } from '../usuario/usuario.service';
import { Permissao } from '../usuario/interfaces/permissao';
import { jwtConstants } from './constants';
import { LoginDto } from './dto/login.dto';
import { AlterarSenhaDto } from './dto/alterar-senha.dto';
import { AuthService } from './auth.service';
import { Payload, PayloadRefreshToken } from './types/payload';

jest.mock('../config/argon', () => ({
  verifyPassword: jest.fn(),
}));

type UsuariosServiceMock = {
  findByEmailAndAtivoTrueAndDeletedAtNull: jest.Mock;
  findByIdAndAtivoTrueAndDeletedAtNull: jest.Mock;
  atualizaSenha: jest.Mock;
};

type SessaoDelegateMock = {
  updateMany: jest.Mock;
  create: jest.Mock;
  findFirst: jest.Mock;
};

type PrismaTransactionMock = {
  sessao: SessaoDelegateMock;
};

type PrismaServiceMock = PrismaTransactionMock & {
  $transaction: jest.Mock;
};

type JwtServiceMock = {
  signAsync: jest.Mock;
  decode: jest.Mock;
  verify: jest.Mock;
};

describe('AuthService', () => {
  let service: AuthService;
  let usuariosService: UsuariosServiceMock;
  let prisma: PrismaTransactionMock;
  let prismaService: PrismaServiceMock;
  let jwtService: JwtServiceMock;
  let verifyPasswordMock: jest.MockedFunction<typeof verifyPassword>;

  const loginDto: LoginDto = {
    email: 'joao@example.com',
    senha: 'Password@123',
  };

  const alterarSenhaDto: AlterarSenhaDto = {
    antigaSenha: 'Password@123',
    novaSenha: 'Password@456',
  };

  const permissoes = [Permissao.GERENCIAR_BASE_DADOS];

  const usuarioComSenha = {
    id: 10,
    nome: 'Joao Silva',
    email: 'joao@example.com',
    admin: false,
    permissoes,
    senha: 'hashed-password',
  };

  const refreshPayload: PayloadRefreshToken = {
    sub: 10,
    sid: 'session-id',
    iat: 100,
    exp: 200,
  };

  const accessPayload: Payload = {
    sub: 10,
    sid: 'session-id',
    admin: false,
    permissoes,
    iat: 100,
    exp: 150,
  };

  beforeEach(() => {
    usuariosService = {
      findByEmailAndAtivoTrueAndDeletedAtNull: jest.fn(),
      findByIdAndAtivoTrueAndDeletedAtNull: jest.fn(),
      atualizaSenha: jest.fn(),
    };

    prisma = createPrismaMock();
    prismaService = {
      ...createPrismaMock(),
      $transaction: jest.fn(
        (callback: (tx: PrismaTransactionMock) => Promise<unknown>) =>
          callback(prisma),
      ),
    };

    jwtService = {
      signAsync: jest.fn(),
      decode: jest.fn(),
      verify: jest.fn(),
    };

    verifyPasswordMock = verifyPassword as jest.MockedFunction<
      typeof verifyPassword
    >;
    verifyPasswordMock.mockResolvedValue(true);

    service = new AuthService(
      usuariosService as unknown as UsuariosService,
      prismaService as unknown as PrismaService,
      jwtService as unknown as JwtService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('login autentica usuario, gera tokens e retorna dados da sessao', async () => {
    usuariosService.findByEmailAndAtivoTrueAndDeletedAtNull.mockResolvedValue(
      usuarioComSenha,
    );
    mockTokenGeneration();

    await expect(
      service.login(loginDto, { ip: '127.0.0.1', userAgent: 'jest' }),
    ).resolves.toEqual({
      id: 10,
      admin: false,
      permissoes,
      refreshToken: 'refresh-token',
      refreshTokenExpiresAt: new Date(refreshPayload.exp * 1000),
      accessToken: 'access-token',
      accessTokenExpiresAt: new Date(accessPayload.exp * 1000),
    });

    expect(
      usuariosService.findByEmailAndAtivoTrueAndDeletedAtNull,
    ).toHaveBeenCalledWith(loginDto.email);
    expect(verifyPasswordMock).toHaveBeenCalledWith(
      usuarioComSenha.senha,
      loginDto.senha,
    );
    expectSessaoCriada(prisma, {
      usuarioId: 10,
      sid: 'session-id',
      ip: '127.0.0.1',
      userAgent: 'jest',
    });
  });

  it('login retorna ForbiddenException quando usuario nao existe', async () => {
    usuariosService.findByEmailAndAtivoTrueAndDeletedAtNull.mockResolvedValue(
      null,
    );

    await expect(service.login(loginDto, {})).rejects.toThrow(
      ForbiddenException,
    );

    expect(verifyPasswordMock).not.toHaveBeenCalled();
    expect(jwtService.signAsync).not.toHaveBeenCalled();
  });

  it('login retorna ForbiddenException quando senha esta incorreta', async () => {
    usuariosService.findByEmailAndAtivoTrueAndDeletedAtNull.mockResolvedValue(
      usuarioComSenha,
    );
    verifyPasswordMock.mockResolvedValue(false);

    await expect(service.login(loginDto, {})).rejects.toThrow(
      ForbiddenException,
    );

    expect(jwtService.signAsync).not.toHaveBeenCalled();
  });

  it('me retorna usuario autenticado sem senha', async () => {
    jwtService.decode.mockReturnValue(accessPayload);
    usuariosService.findByIdAndAtivoTrueAndDeletedAtNull.mockResolvedValue(
      usuarioComSenha,
    );

    await expect(service.me('access-token')).resolves.toEqual({
      id: 10,
      nome: 'Joao Silva',
      email: 'joao@example.com',
      admin: false,
      permissoes,
    });

    expect(jwtService.decode).toHaveBeenCalledWith('access-token');
    expect(
      usuariosService.findByIdAndAtivoTrueAndDeletedAtNull,
    ).toHaveBeenCalledWith(10);
  });

  it('me retorna ForbiddenException quando access token esta ausente', async () => {
    await expect(service.me()).rejects.toThrow(ForbiddenException);

    expect(jwtService.decode).not.toHaveBeenCalled();
  });

  it('me retorna ForbiddenException quando usuario nao existe', async () => {
    jwtService.decode.mockReturnValue(accessPayload);
    usuariosService.findByIdAndAtivoTrueAndDeletedAtNull.mockResolvedValue(
      null,
    );

    await expect(service.me('access-token')).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('alteraSenha delega alteracao para UsuariosService', async () => {
    jwtService.decode.mockReturnValue(accessPayload);
    usuariosService.atualizaSenha.mockResolvedValue(undefined);

    await expect(
      service.alteraSenha('access-token', alterarSenhaDto),
    ).resolves.toBeUndefined();

    expect(usuariosService.atualizaSenha).toHaveBeenCalledWith(
      10,
      alterarSenhaDto.antigaSenha,
      alterarSenhaDto.novaSenha,
    );
  });

  it('alteraSenha retorna ForbiddenException quando faltam dados', async () => {
    await expect(service.alteraSenha()).rejects.toThrow(ForbiddenException);

    expect(usuariosService.atualizaSenha).not.toHaveBeenCalled();
  });

  it('generateTokens assina tokens e cria sessao', async () => {
    mockTokenGeneration();

    await expect(
      service.generateTokens(10, false, permissoes, {
        ip: '127.0.0.1',
        userAgent: 'jest',
      }),
    ).resolves.toEqual({
      accessToken: 'access-token',
      accessTokenExpiresAt: new Date(accessPayload.exp * 1000),
      refreshToken: 'refresh-token',
      refreshTokenExpiresAt: new Date(refreshPayload.exp * 1000),
    });

    expect(jwtService.signAsync).toHaveBeenCalledTimes(2);
    const [accessSignPayload, accessSignOptions] = jwtService.signAsync.mock
      .calls[0] as [
      {
        sub: number;
        sid: string;
        admin: boolean;
        permissoes: Permissao[];
      },
      {
        secret: string;
        expiresIn: string;
      },
    ];
    expect(accessSignPayload.sub).toBe(10);
    expect(accessSignPayload.sid).toEqual(expect.any(String));
    expect(accessSignPayload.admin).toBe(false);
    expect(accessSignPayload.permissoes).toEqual(permissoes);
    expect(accessSignOptions).toEqual({
      secret: jwtConstants.secret,
      expiresIn: jwtConstants.expiresInAccessToken,
    });

    const [refreshSignPayload, refreshSignOptions] = jwtService.signAsync.mock
      .calls[1] as [
      {
        sub: number;
        sid: string;
      },
      {
        secret: string;
        expiresIn: string;
      },
    ];
    expect(refreshSignPayload.sub).toBe(10);
    expect(refreshSignPayload.sid).toEqual(accessSignPayload.sid);
    expect(refreshSignOptions).toEqual({
      secret: jwtConstants.secret,
      expiresIn: jwtConstants.expiresInRefreshToken,
    });
    expectSessaoCriada(prisma, {
      usuarioId: 10,
      sid: 'session-id',
      ip: '127.0.0.1',
      userAgent: 'jest',
    });
  });

  it('generateTokens retorna UnauthorizedException quando refresh token decodificado e invalido', async () => {
    jwtService.signAsync
      .mockResolvedValueOnce('access-token')
      .mockResolvedValueOnce('refresh-token');
    jwtService.decode.mockReturnValueOnce(null);

    await expect(service.generateTokens(10, false, [], {})).rejects.toThrow(
      UnauthorizedException,
    );

    expect(prismaService.$transaction).not.toHaveBeenCalled();
  });

  it('generateTokens retorna UnauthorizedException quando access token decodificado e invalido', async () => {
    jwtService.signAsync
      .mockResolvedValueOnce('access-token')
      .mockResolvedValueOnce('refresh-token');
    jwtService.decode
      .mockReturnValueOnce(refreshPayload)
      .mockReturnValueOnce(null);

    await expect(service.generateTokens(10, false, [], {})).rejects.toThrow(
      UnauthorizedException,
    );

    expect(prismaService.$transaction).not.toHaveBeenCalled();
  });

  it('refresh gera novo access token quando sessao e usuario sao validos', async () => {
    jwtService.verify.mockReturnValue(refreshPayload);
    prismaService.sessao.findFirst.mockResolvedValue({ sid: 'session-id' });
    usuariosService.findByIdAndAtivoTrueAndDeletedAtNull.mockResolvedValue(
      usuarioComSenha,
    );
    jwtService.signAsync.mockResolvedValue('new-access-token');
    jwtService.decode.mockReturnValue(accessPayload);

    await expect(service.refresh('refresh-token')).resolves.toEqual({
      accessToken: 'new-access-token',
      accessTokenExpiresAt: new Date(accessPayload.exp * 1000),
      user: {
        id: 10,
        admin: false,
        permissoes,
      },
    });

    expect(jwtService.verify).toHaveBeenCalledWith('refresh-token', {
      secret: jwtConstants.secret,
    });
    expect(prismaService.sessao.findFirst).toHaveBeenCalledTimes(1);
    const [findFirstArgs] = prismaService.sessao.findFirst.mock.calls[0] as [
      {
        where: {
          sid: string;
          usuarioId: number;
          revokedAt: null;
          expiredAt: {
            gt: Date;
          };
        };
        select: {
          sid: boolean;
        };
      },
    ];
    expect(findFirstArgs.where.sid).toBe('session-id');
    expect(findFirstArgs.where.usuarioId).toBe(10);
    expect(findFirstArgs.where.revokedAt).toBeNull();
    expect(findFirstArgs.where.expiredAt.gt).toBeInstanceOf(Date);
    expect(findFirstArgs.select).toEqual({
      sid: true,
    });
    expect(jwtService.signAsync).toHaveBeenCalledWith(
      {
        sub: 10,
        sid: 'session-id',
        admin: false,
        permissoes,
      },
      {
        secret: jwtConstants.secret,
        expiresIn: jwtConstants.expiresInAccessToken,
      },
    );
  });

  it('refresh retorna UnauthorizedException quando refresh token esta ausente', async () => {
    await expect(service.refresh()).rejects.toThrow(UnauthorizedException);

    expect(jwtService.verify).not.toHaveBeenCalled();
  });

  it('refresh retorna UnauthorizedException quando sessao nao existe', async () => {
    jwtService.verify.mockReturnValue(refreshPayload);
    prismaService.sessao.findFirst.mockResolvedValue(null);

    await expect(service.refresh('refresh-token')).rejects.toThrow(
      UnauthorizedException,
    );

    expect(
      usuariosService.findByIdAndAtivoTrueAndDeletedAtNull,
    ).not.toHaveBeenCalled();
  });

  it('refresh retorna ForbiddenException quando usuario nao existe', async () => {
    jwtService.verify.mockReturnValue(refreshPayload);
    prismaService.sessao.findFirst.mockResolvedValue({ sid: 'session-id' });
    usuariosService.findByIdAndAtivoTrueAndDeletedAtNull.mockResolvedValue(
      null,
    );

    await expect(service.refresh('refresh-token')).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('refresh retorna UnauthorizedException quando access token decodificado e invalido', async () => {
    jwtService.verify.mockReturnValue(refreshPayload);
    prismaService.sessao.findFirst.mockResolvedValue({ sid: 'session-id' });
    usuariosService.findByIdAndAtivoTrueAndDeletedAtNull.mockResolvedValue(
      usuarioComSenha,
    );
    jwtService.signAsync.mockResolvedValue('new-access-token');
    jwtService.decode.mockReturnValue(null);

    await expect(service.refresh('refresh-token')).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('logout sem refresh token retorna sucesso sem revogar sessao', async () => {
    await expect(service.logout()).resolves.toEqual({ success: true });

    expect(jwtService.verify).not.toHaveBeenCalled();
    expect(prismaService.sessao.updateMany).not.toHaveBeenCalled();
  });

  it('logout revoga sessao do refresh token', async () => {
    jwtService.verify.mockReturnValue(refreshPayload);

    await expect(service.logout('refresh-token')).resolves.toEqual({
      success: true,
    });

    expect(prismaService.sessao.updateMany).toHaveBeenCalledTimes(1);
    const [args] = prismaService.sessao.updateMany.mock.calls[0] as [
      {
        where: {
          sid: string;
          usuarioId: number;
          revokedAt: null;
        };
        data: {
          revokedAt: Date;
        };
      },
    ];
    expect(args.where).toEqual({
      sid: 'session-id',
      usuarioId: 10,
      revokedAt: null,
    });
    expect(args.data.revokedAt).toBeInstanceOf(Date);
  });

  it('verifyAccessToken valida access token com secret configurado', () => {
    jwtService.verify.mockReturnValue(accessPayload);

    expect(service.verifyAccessToken('access-token')).toEqual(accessPayload);
    expect(jwtService.verify).toHaveBeenCalledWith('access-token', {
      secret: jwtConstants.secret,
    });
  });

  it('verifyRefreshToken valida refresh token com secret configurado', () => {
    jwtService.verify.mockReturnValue(refreshPayload);

    expect(service.verifyRefreshToken('refresh-token')).toEqual(refreshPayload);
    expect(jwtService.verify).toHaveBeenCalledWith('refresh-token', {
      secret: jwtConstants.secret,
    });
  });

  it('retornaSessaoIdPeloSidERevokedAtNull retorna id da sessao ativa', async () => {
    prismaService.sessao.findFirst.mockResolvedValue({ id: 123 });

    await expect(
      service.retornaSessaoIdPeloSidERevokedAtNull('session-id'),
    ).resolves.toBe(123);

    expect(prismaService.sessao.findFirst).toHaveBeenCalledWith({
      where: {
        sid: { equals: 'session-id' },
        revokedAt: { equals: null },
      },
      select: { id: true },
    });
  });

  it('retornaSessaoIdPeloSidERevokedAtNull retorna null quando sessao nao existe', async () => {
    prismaService.sessao.findFirst.mockResolvedValue(null);

    await expect(
      service.retornaSessaoIdPeloSidERevokedAtNull('session-id'),
    ).resolves.toBeNull();
  });

  function mockTokenGeneration(): void {
    jwtService.signAsync
      .mockResolvedValueOnce('access-token')
      .mockResolvedValueOnce('refresh-token');
    jwtService.decode
      .mockReturnValueOnce(refreshPayload)
      .mockReturnValueOnce(accessPayload);
  }
});

function createPrismaMock(): PrismaTransactionMock {
  return {
    sessao: {
      updateMany: jest.fn(),
      create: jest.fn(),
      findFirst: jest.fn(),
    },
  };
}

function expectSessaoCriada(
  prisma: PrismaTransactionMock,
  expected: {
    usuarioId: number;
    sid: string;
    ip?: string;
    userAgent?: string;
  },
): void {
  expect(prisma.sessao.updateMany).toHaveBeenCalledTimes(1);
  expect(prisma.sessao.create).toHaveBeenCalledTimes(1);

  const [updateManyArgs] = prisma.sessao.updateMany.mock.calls[0] as [
    {
      where: {
        usuarioId: number;
        revokedAt: null;
        expiredAt: {
          gt: Date;
        };
      };
      data: {
        revokedAt: Date;
      };
    },
  ];
  expect(updateManyArgs.where.usuarioId).toBe(expected.usuarioId);
  expect(updateManyArgs.where.revokedAt).toBeNull();
  expect(updateManyArgs.where.expiredAt.gt).toBeInstanceOf(Date);
  expect(updateManyArgs.data.revokedAt).toBeInstanceOf(Date);

  const [createArgs] = prisma.sessao.create.mock.calls[0] as [
    {
      data: {
        sid: string;
        usuarioId: number;
        dados: {
          ip?: string;
          userAgent?: string;
        };
        createdAt: Date;
        expiredAt: Date;
      };
      select: {
        id: boolean;
      };
    },
  ];
  expect(createArgs.data.sid).toBe(expected.sid);
  expect(createArgs.data.usuarioId).toBe(expected.usuarioId);
  expect(createArgs.data.dados).toEqual({
    ip: expected.ip,
    userAgent: expected.userAgent,
  });
  expect(createArgs.data.createdAt).toEqual(new Date(100000));
  expect(createArgs.data.expiredAt).toEqual(new Date(200000));
  expect(createArgs.select).toEqual({ id: true });
}
