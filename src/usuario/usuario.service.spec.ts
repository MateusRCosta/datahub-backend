import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { hashPassword, verifyPassword } from 'src/config/argon';
import { AlteraStatus } from 'src/common/dto/altera-status.dto';
import { UsuariosService } from './usuario.service';
import { UsuarioCreateDto } from './dto/usuario-create.dto';
import { UsuarioFindAllQueryDto } from './dto/usuario-find-all-query.dto';
import { UsuarioUpdateDto } from './dto/usuario-update.dto';
import { Permissao } from './interfaces/permissao';

jest.mock('src/config/argon', () => ({
  hashPassword: jest.fn(),
  verifyPassword: jest.fn(),
}));

type UsuarioDelegateMock = {
  findMany: jest.Mock;
  count: jest.Mock;
  findFirst: jest.Mock;
  findUnique: jest.Mock;
  create: jest.Mock;
  update: jest.Mock;
};

type SessaoDelegateMock = {
  updateMany: jest.Mock;
};

type PrismaTransactionMock = {
  usuario: UsuarioDelegateMock;
  sessao: SessaoDelegateMock;
  $executeRaw: jest.Mock;
};

type TransactionInput =
  | Promise<unknown>[]
  | ((tx: PrismaTransactionMock) => Promise<unknown>);

type PrismaServiceMock = PrismaTransactionMock & {
  $transaction: jest.Mock;
};

describe('UsuariosService', () => {
  let service: UsuariosService;
  let prisma: PrismaTransactionMock;
  let prismaService: PrismaServiceMock;
  let hashPasswordMock: jest.MockedFunction<typeof hashPassword>;
  let verifyPasswordMock: jest.MockedFunction<typeof verifyPassword>;

  const usuarioCreateDto: UsuarioCreateDto = {
    nome: 'Joao Silva',
    email: 'joao@example.com',
    senha: 'Password@123',
    admin: false,
    permissoes: [Permissao.GERENCIAR_BASE_DADOS],
  };

  const usuarioUpdateDto: UsuarioUpdateDto = {
    nome: 'Maria Silva',
    senha: 'Password@456',
    admin: true,
    permissoes: [Permissao.GERENCIAR_CAMPANHAS],
  };

  beforeEach(() => {
    prisma = createPrismaMock();
    prismaService = {
      ...createPrismaMock(),
      $transaction: jest.fn((input: TransactionInput) => {
        if (Array.isArray(input)) {
          return Promise.all(input);
        }

        return input(prisma);
      }),
    };

    hashPasswordMock = hashPassword as jest.MockedFunction<typeof hashPassword>;
    verifyPasswordMock = verifyPassword as jest.MockedFunction<
      typeof verifyPassword
    >;

    hashPasswordMock.mockResolvedValue('hashed-password');
    verifyPasswordMock.mockResolvedValue(true);

    service = new UsuariosService(prismaService as never);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('retornaTodos lista usuarios paginados com select enxuto', async () => {
    const data = [
      {
        id: 10,
        nome: 'Joao Silva',
        email: 'joao@example.com',
        admin: false,
        ativo: true,
        permissoes: [Permissao.GERENCIAR_BASE_DADOS],
      },
    ];
    const query: UsuarioFindAllQueryDto = {
      page: 2,
      limit: 5,
      orderBy: 'nome',
      order: 'asc',
      nome: 'Joao',
    };

    prismaService.usuario.findMany.mockResolvedValue(data);
    prismaService.usuario.count.mockResolvedValue(12);

    await expect(service.retornaTodos(query)).resolves.toEqual({
      data,
      meta: {
        page: 2,
        limit: 5,
        total: 12,
        totalPages: 3,
        hasNextPage: true,
        hasPreviousPage: true,
      },
    });

    expect(prismaService.usuario.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 5,
        take: 5,
        select: {
          id: true,
          nome: true,
          email: true,
          admin: true,
          ativo: true,
          permissoes: true,
        },
      }),
    );
    expect(prismaService.usuario.count).toHaveBeenCalledTimes(1);
    expect(prismaService.$transaction).toHaveBeenCalledWith([
      expect.any(Promise),
      expect.any(Promise),
    ]);
  });

  it('retornaPorId busca usuario nao deletado pelo id', async () => {
    const usuario = {
      id: 10,
      nome: 'Joao Silva',
      email: 'joao@example.com',
      admin: false,
      permissoes: [Permissao.GERENCIAR_BASE_DADOS],
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    };
    prismaService.usuario.findFirst.mockResolvedValue(usuario);

    await expect(service.retornaPorId(10)).resolves.toEqual(usuario);

    expect(prismaService.usuario.findFirst).toHaveBeenCalledWith({
      where: { id: 10, deletedAt: null },
      select: {
        id: true,
        nome: true,
        email: true,
        admin: true,
        permissoes: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  });

  it('retornaPorId retorna BadRequestException para id invalido', async () => {
    await expect(service.retornaPorId(Number.NaN)).rejects.toThrow(
      BadRequestException,
    );

    expect(prismaService.usuario.findFirst).not.toHaveBeenCalled();
  });

  it('retornaPorId retorna NotFoundException quando usuario nao existe', async () => {
    prismaService.usuario.findFirst.mockResolvedValue(null);

    await expect(service.retornaPorId(10)).rejects.toThrow(NotFoundException);
  });

  it('findByEmailAndAtivoTrueAndDeletedAtNull busca usuario ativo por email', async () => {
    const usuario = {
      id: 10,
      nome: 'Joao Silva',
      email: 'joao@example.com',
      admin: false,
      permissoes: [Permissao.GERENCIAR_BASE_DADOS],
      senha: 'hashed-password',
    };
    prismaService.usuario.findFirst.mockResolvedValue(usuario);

    await expect(
      service.findByEmailAndAtivoTrueAndDeletedAtNull('joao@example.com'),
    ).resolves.toEqual(usuario);

    expect(prismaService.usuario.findFirst).toHaveBeenCalledWith({
      where: { email: 'joao@example.com', deletedAt: null, ativo: true },
      select: {
        id: true,
        nome: true,
        email: true,
        admin: true,
        permissoes: true,
        senha: true,
      },
    });
  });

  it('findByIdAndAtivoTrueAndDeletedAtNull busca usuario ativo por id', async () => {
    const usuario = {
      id: 10,
      nome: 'Joao Silva',
      email: 'joao@example.com',
      admin: false,
      permissoes: [Permissao.GERENCIAR_BASE_DADOS],
      senha: 'hashed-password',
    };
    prismaService.usuario.findFirst.mockResolvedValue(usuario);

    await expect(
      service.findByIdAndAtivoTrueAndDeletedAtNull(10),
    ).resolves.toEqual(usuario);

    expect(prismaService.usuario.findFirst).toHaveBeenCalledWith({
      where: { id: 10, deletedAt: null, ativo: true },
      select: {
        id: true,
        nome: true,
        email: true,
        admin: true,
        permissoes: true,
        senha: true,
      },
    });
  });

  it('cria usuario com senha hasheada e retorna o id', async () => {
    prisma.usuario.findUnique.mockResolvedValue(null);
    prisma.usuario.create.mockResolvedValue({ id: 10 });

    await expect(service.cria(usuarioCreateDto)).resolves.toEqual({ id: 10 });

    expect(prismaService.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.usuario.findUnique).toHaveBeenCalledWith({
      where: { email: usuarioCreateDto.email },
      select: { email: true },
    });
    expect(hashPasswordMock).toHaveBeenCalledWith(usuarioCreateDto.senha);
    expect(prisma.usuario.create).toHaveBeenCalledWith({
      data: {
        nome: usuarioCreateDto.nome,
        email: usuarioCreateDto.email,
        senha: 'hashed-password',
        admin: usuarioCreateDto.admin,
        permissoes: usuarioCreateDto.permissoes,
      },
      select: {
        id: true,
      },
    });
  });

  it('cria retorna ConflictException quando o email ja existe', async () => {
    prisma.usuario.findUnique.mockResolvedValue({
      email: usuarioCreateDto.email,
    });

    await expect(service.cria(usuarioCreateDto)).rejects.toThrow(
      ConflictException,
    );

    expect(hashPasswordMock).not.toHaveBeenCalled();
    expect(prisma.usuario.create).not.toHaveBeenCalled();
  });

  it('atualiza usuario e revoga sessoes quando altera dado sensivel', async () => {
    prisma.usuario.findFirst.mockResolvedValue({ id: 10 });
    prisma.usuario.update.mockResolvedValue({ id: 10 });

    await expect(service.atualiza(usuarioUpdateDto, 10)).resolves.toEqual({
      id: 10,
    });

    expect(hashPasswordMock).toHaveBeenCalledWith(usuarioUpdateDto.senha);
    expect(prisma.usuario.update).toHaveBeenCalledWith({
      where: { id: 10 },
      data: {
        nome: usuarioUpdateDto.nome,
        senha: 'hashed-password',
        admin: usuarioUpdateDto.admin,
        permissoes: usuarioUpdateDto.permissoes,
      },
      select: { id: true },
    });
    expectRevogacaoSessoesAtivas(prisma.sessao.updateMany, 10);
  });

  it('atualiza usuario sem revogar sessoes quando altera apenas nome', async () => {
    prisma.usuario.findFirst.mockResolvedValue({ id: 10 });
    prisma.usuario.update.mockResolvedValue({ id: 10 });

    await expect(
      service.atualiza({ nome: 'Maria Silva' }, 10),
    ).resolves.toEqual({
      id: 10,
    });

    expect(prisma.usuario.update).toHaveBeenCalledWith({
      where: { id: 10 },
      data: {
        nome: 'Maria Silva',
      },
      select: { id: true },
    });
    expect(prisma.sessao.updateMany).not.toHaveBeenCalled();
  });

  it('atualiza retorna NotFoundException quando usuario nao existe', async () => {
    prisma.usuario.findFirst.mockResolvedValue(null);

    await expect(service.atualiza(usuarioUpdateDto, 10)).rejects.toThrow(
      NotFoundException,
    );

    expect(prisma.usuario.update).not.toHaveBeenCalled();
  });

  it('atualizaSenha altera senha quando senha antiga confere', async () => {
    prisma.usuario.findFirst.mockResolvedValue({
      id: 10,
      senha: 'old-hashed-password',
    });
    prisma.usuario.update.mockResolvedValue({ id: 10 });

    await expect(
      service.atualizaSenha(10, 'Password@123', 'Password@456'),
    ).resolves.toBeUndefined();

    expect(verifyPasswordMock).toHaveBeenCalledWith(
      'old-hashed-password',
      'Password@123',
    );
    expect(hashPasswordMock).toHaveBeenCalledWith('Password@456');
    expect(prisma.usuario.update).toHaveBeenCalledTimes(1);
    const [updateArgs] = prisma.usuario.update.mock.calls[0] as [
      {
        where: { id: number };
        data: { senha: string; updatedAt: Date };
        select: { id: boolean };
      },
    ];
    expect(updateArgs).toMatchObject({
      where: { id: 10 },
      data: {
        senha: 'hashed-password',
      },
      select: {
        id: true,
      },
    });
    expect(updateArgs.data.updatedAt).toBeInstanceOf(Date);
    expect(prisma.sessao.updateMany).toHaveBeenCalledTimes(1);
  });

  it('atualizaSenha retorna ForbiddenException quando usuario nao existe', async () => {
    prisma.usuario.findFirst.mockResolvedValue(null);

    await expect(
      service.atualizaSenha(10, 'Password@123', 'Password@456'),
    ).rejects.toThrow(ForbiddenException);

    expect(verifyPasswordMock).not.toHaveBeenCalled();
    expect(prisma.usuario.update).not.toHaveBeenCalled();
  });

  it('atualizaSenha retorna ForbiddenException quando senha antiga esta incorreta', async () => {
    prisma.usuario.findFirst.mockResolvedValue({
      id: 10,
      senha: 'old-hashed-password',
    });
    verifyPasswordMock.mockResolvedValue(false);

    await expect(
      service.atualizaSenha(10, 'senha-incorreta', 'Password@456'),
    ).rejects.toThrow(ForbiddenException);

    expect(hashPasswordMock).not.toHaveBeenCalled();
    expect(prisma.usuario.update).not.toHaveBeenCalled();
  });

  it('atualizaStatus atualiza status e revoga sessoes', async () => {
    const alteraStatus: AlteraStatus = { status: false };
    prisma.$executeRaw.mockResolvedValue(1);

    await expect(
      service.atualizaStatus(10, alteraStatus, 99),
    ).resolves.toBeUndefined();

    expect(prismaService.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.$executeRaw).toHaveBeenCalledTimes(1);
    expectRevogacaoSessoesAtivas(prisma.sessao.updateMany, 10);
  });

  it('atualizaStatus retorna BadRequestException quando altera o proprio usuario', async () => {
    await expect(
      service.atualizaStatus(10, { status: false }, 10),
    ).rejects.toThrow(BadRequestException);

    expect(prismaService.$transaction).not.toHaveBeenCalled();
  });

  it('atualizaStatus retorna NotFoundException quando update nao altera linhas', async () => {
    prisma.$executeRaw.mockResolvedValue(0);

    await expect(
      service.atualizaStatus(10, { status: false }, 99),
    ).rejects.toThrow(NotFoundException);

    expect(prisma.sessao.updateMany).not.toHaveBeenCalled();
  });

  it('exclui faz soft delete e revoga sessoes', async () => {
    prisma.$executeRaw.mockResolvedValue(1);

    await expect(service.exclui(10, 99)).resolves.toBeUndefined();

    expect(prismaService.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.$executeRaw).toHaveBeenCalledTimes(1);
    expectRevogacaoSessoesAtivas(prisma.sessao.updateMany, 10);
  });

  it('exclui retorna BadRequestException quando exclui o proprio usuario', async () => {
    await expect(service.exclui(10, 10)).rejects.toThrow(BadRequestException);

    expect(prismaService.$transaction).not.toHaveBeenCalled();
  });

  it('exclui retorna NotFoundException quando update nao altera linhas', async () => {
    prisma.$executeRaw.mockResolvedValue(0);

    await expect(service.exclui(10, 99)).rejects.toThrow(NotFoundException);

    expect(prisma.sessao.updateMany).not.toHaveBeenCalled();
  });
});

function createPrismaMock(): PrismaTransactionMock {
  return {
    usuario: {
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    sessao: {
      updateMany: jest.fn(),
    },
    $executeRaw: jest.fn(),
  };
}

function expectRevogacaoSessoesAtivas(
  updateMany: jest.Mock,
  usuarioId: number,
): void {
  expect(updateMany).toHaveBeenCalledTimes(1);

  const [args] = updateMany.mock.calls[0] as [
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

  expect(args.where.usuarioId).toBe(usuarioId);
  expect(args.where.revokedAt).toBeNull();
  expect(args.where.expiredAt.gt).toBeInstanceOf(Date);
  expect(args.data.revokedAt).toBeInstanceOf(Date);
}
