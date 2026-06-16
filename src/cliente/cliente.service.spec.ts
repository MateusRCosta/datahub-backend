import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { TipoCampo } from 'src/base-dados/util/type';
import { ClienteFindAllQueryDto } from './dto/cliente-find-all-query.dto';
import { ClientesCriacaoService } from './cliente-criacao.service';
import { ClientesService } from './cliente.service';

type ClienteDelegateMock = {
  findMany: jest.Mock;
  count: jest.Mock;
  findFirst: jest.Mock;
  update: jest.Mock;
};

type PrismaTransactionMock = {
  cliente: ClienteDelegateMock;
};

type TransactionInput =
  | Promise<unknown>[]
  | ((tx: PrismaTransactionMock) => Promise<unknown>);

type PrismaServiceMock = PrismaTransactionMock & {
  $transaction: jest.Mock;
};

type ClientesCriacaoServiceMock = {
  criaOuAtualizaClientesDaBase: jest.Mock;
  criaClientesDaBase: jest.Mock;
  revalidaClientesDaBase: jest.Mock;
  geraHash: jest.Mock;
};

describe('ClientesService', () => {
  let service: ClientesService;
  let prisma: PrismaTransactionMock;
  let prismaService: PrismaServiceMock;
  let clientesCriacaoService: ClientesCriacaoServiceMock;

  const estrutura = [
    {
      cabecalho: 'email',
      tipo: TipoCampo.EMAIL,
      obrigatorio: true,
    },
    {
      cabecalho: 'nome',
      tipo: TipoCampo.TEXTO,
      obrigatorio: false,
    },
  ];

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

    clientesCriacaoService = {
      criaOuAtualizaClientesDaBase: jest.fn(),
      criaClientesDaBase: jest.fn(),
      revalidaClientesDaBase: jest.fn(),
      geraHash: jest.fn().mockReturnValue('hash-atualizado'),
    };

    service = new ClientesService(
      prismaService as never,
      clientesCriacaoService as unknown as ClientesCriacaoService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('criaOuAtualizaClientesDaBase delega para ClientesCriacaoService', async () => {
    const linhas = [{ email: 'joao@example.com' }];
    clientesCriacaoService.criaOuAtualizaClientesDaBase.mockResolvedValue({
      criados: 1,
      atualizados: 0,
    });

    await expect(
      service.criaOuAtualizaClientesDaBase(
        prisma as never,
        10,
        estrutura,
        linhas,
        ['email'],
      ),
    ).resolves.toEqual({ criados: 1, atualizados: 0 });

    expect(
      clientesCriacaoService.criaOuAtualizaClientesDaBase,
    ).toHaveBeenCalledWith(prisma, 10, estrutura, linhas, ['email']);
  });

  it('criaClientesDaBase delega para ClientesCriacaoService', async () => {
    const linhas = [{ email: 'joao@example.com' }];
    clientesCriacaoService.criaClientesDaBase.mockResolvedValue(true);

    await expect(
      service.criaClientesDaBase(prisma as never, 10, estrutura, linhas),
    ).resolves.toBe(true);

    expect(clientesCriacaoService.criaClientesDaBase).toHaveBeenCalledWith(
      prisma,
      10,
      estrutura,
      linhas,
    );
  });

  it('revalidaClientesDaBase delega para ClientesCriacaoService', async () => {
    clientesCriacaoService.revalidaClientesDaBase.mockResolvedValue(2);

    await expect(
      service.revalidaClientesDaBase(prisma as never, 10, estrutura),
    ).resolves.toBe(2);

    expect(clientesCriacaoService.revalidaClientesDaBase).toHaveBeenCalledWith(
      prisma,
      10,
      estrutura,
    );
  });

  it('retornaTodos lista clientes paginados com select enxuto', async () => {
    const data = [
      {
        id: 1,
        dados: { email: 'joao@example.com' },
        validacao: [],
        baseDeDadosId: 10,
      },
    ];
    const query: ClienteFindAllQueryDto = {
      page: 2,
      limit: 5,
      baseDeDadosId: 10,
      orderBy: 'id',
      order: 'asc',
    };
    prismaService.cliente.findMany.mockResolvedValue(data);
    prismaService.cliente.count.mockResolvedValue(12);

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

    expect(prismaService.cliente.findMany).toHaveBeenCalledTimes(1);
    const [findManyArgs] = prismaService.cliente.findMany.mock.calls[0] as [
      {
        skip: number;
        take: number;
        select: Record<string, unknown>;
      },
    ];
    expect(findManyArgs.skip).toBe(5);
    expect(findManyArgs.take).toBe(5);
    expect(findManyArgs.select).toEqual({
      id: true,
      dados: true,
      validacao: true,
      baseDeDadosId: true,
    });
    expect(prismaService.cliente.count).toHaveBeenCalledTimes(1);
  });

  it('buscaIdsPorBase busca ids ordenados por base', async () => {
    prismaService.cliente.findMany.mockResolvedValue([{ id: 1 }, { id: 2 }]);

    await expect(service.buscaIdsPorBase(10, 5, 20)).resolves.toEqual([
      { id: 1 },
      { id: 2 },
    ]);

    expect(prismaService.cliente.findMany).toHaveBeenCalledWith({
      where: {
        baseDeDadosId: 10,
        deletedAt: null,
      },
      select: { id: true },
      orderBy: { id: 'asc' },
      skip: 5,
      take: 20,
    });
  });

  it('retornaPorId retorna cliente pelo id', async () => {
    const cliente = {
      id: 1,
      dados: { email: 'joao@example.com' },
      validacao: [],
      baseDeDadosId: 10,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    };
    prismaService.cliente.findFirst.mockResolvedValue(cliente);

    await expect(service.retornaPorId(1)).resolves.toEqual(cliente);

    expect(prismaService.cliente.findFirst).toHaveBeenCalledWith({
      where: { id: 1, deletedAt: null },
      select: {
        id: true,
        dados: true,
        validacao: true,
        baseDeDadosId: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  });

  it('retornaPorId retorna BadRequestException para id invalido', async () => {
    await expect(service.retornaPorId(Number.NaN)).rejects.toThrow(
      BadRequestException,
    );

    expect(prismaService.cliente.findFirst).not.toHaveBeenCalled();
  });

  it('retornaPorId retorna NotFoundException quando cliente nao existe', async () => {
    prismaService.cliente.findFirst.mockResolvedValue(null);

    await expect(service.retornaPorId(1)).rejects.toThrow(NotFoundException);
  });

  it('atualiza cliente com dados normalizados', async () => {
    prisma.cliente.findFirst.mockResolvedValue({
      id: 1,
      baseDeDados: {
        id: 10,
        estrutura,
      },
      dados: {
        email: 'antigo@example.com',
      },
    });
    prisma.cliente.update.mockResolvedValue({ id: 1 });

    await expect(
      service.atualiza(1, {
        dados: {
          email: 'joao@example.com',
          nome: 'Joao',
        },
      }),
    ).resolves.toEqual({ id: 1 });

    expect(clientesCriacaoService.geraHash).toHaveBeenCalledWith({
      email: 'joao@example.com',
      nome: 'Joao',
    });
    expect(prisma.cliente.update).toHaveBeenCalledTimes(1);
    const [updateArgs] = prisma.cliente.update.mock.calls[0] as [
      {
        where: { id: number };
        data: {
          updatedAt: Date;
          dados: Record<string, unknown>;
          hash: string;
          validacao: unknown[];
        };
        select: { id: boolean };
      },
    ];
    expect(updateArgs.where).toEqual({ id: 1 });
    expect(updateArgs.data.updatedAt).toBeInstanceOf(Date);
    expect(updateArgs.data.dados).toEqual({
      email: 'joao@example.com',
      nome: 'Joao',
    });
    expect(updateArgs.data.hash).toBe('hash-atualizado');
    expect(updateArgs.data.validacao).toEqual([]);
    expect(updateArgs.select).toEqual({ id: true });
  });

  it('atualiza retorna BadRequest e nao salva quando os dados possuem erro de campo', async () => {
    prisma.cliente.findFirst.mockResolvedValue({
      id: 1,
      baseDeDados: {
        id: 10,
        estrutura: [
          {
            cabecalho: 'email',
            tipo: TipoCampo.EMAIL,
            obrigatorio: true,
          },
        ],
      },
      dados: {
        email: 'antigo@example.com',
      },
    });

    await expect(
      service.atualiza(1, {
        dados: {
          email: 'email-invalido',
        },
      }),
    ).rejects.toThrow(BadRequestException);

    expect(prisma.cliente.update).not.toHaveBeenCalled();
  });

  it('atualiza retorna NotFoundException quando cliente nao existe', async () => {
    prisma.cliente.findFirst.mockResolvedValue(null);

    await expect(
      service.atualiza(1, {
        dados: {
          email: 'joao@example.com',
        },
      }),
    ).rejects.toThrow(NotFoundException);

    expect(prisma.cliente.update).not.toHaveBeenCalled();
  });

  it('atualiza converte erro unico de hash em ConflictException', async () => {
    prisma.cliente.findFirst.mockResolvedValue({
      id: 1,
      baseDeDados: {
        id: 10,
        estrutura,
      },
      dados: {
        email: 'antigo@example.com',
      },
    });
    prisma.cliente.update.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('unique violation', {
        code: 'P2002',
        clientVersion: 'test',
      }),
    );

    await expect(
      service.atualiza(1, {
        dados: {
          email: 'joao@example.com',
        },
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('exclui faz soft delete do cliente', async () => {
    prisma.cliente.findFirst.mockResolvedValue({ id: 1 });
    prisma.cliente.update.mockResolvedValue({ id: 1 });

    await expect(service.exclui(1)).resolves.toBeUndefined();

    expect(prisma.cliente.update).toHaveBeenCalledTimes(1);
    const [updateArgs] = prisma.cliente.update.mock.calls[0] as [
      {
        where: { id: number };
        data: {
          deletedAt: Date;
          updatedAt: Date;
        };
      },
    ];
    expect(updateArgs.where).toEqual({ id: 1 });
    expect(updateArgs.data.deletedAt).toBeInstanceOf(Date);
    expect(updateArgs.data.updatedAt).toBeInstanceOf(Date);
  });

  it('exclui retorna NotFoundException quando cliente nao existe', async () => {
    prisma.cliente.findFirst.mockResolvedValue(null);

    await expect(service.exclui(1)).rejects.toThrow(NotFoundException);

    expect(prisma.cliente.update).not.toHaveBeenCalled();
  });
});

function createPrismaMock(): PrismaTransactionMock {
  return {
    cliente: {
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  };
}
