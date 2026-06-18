import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CsvParser } from 'nest-csv-parser';
import { Prisma } from '@prisma/client';
import { ClientesService } from 'src/cliente/cliente.service';
import { TipoCampo } from 'src/common/types/dados.types';
import { BaseDadosService } from './base-dados.service';
import { BaseDadosCreateDto } from './dto/base-dados-create.dto';
import { BaseDadosEstruturaDto } from './dto/base-dados-estrutura.dto';
import { BaseDadosFindAllQueryDto } from './dto/base-dados-find-all-query.dto';
import { BaseDadosUpdateDto } from './dto/base-dados-update.dto';

type BaseDeDadosDelegateMock = {
  findMany: jest.Mock;
  count: jest.Mock;
  findUnique: jest.Mock;
  findFirst: jest.Mock;
  create: jest.Mock;
  update: jest.Mock;
};

type ClienteDelegateMock = {
  updateMany: jest.Mock;
};

type PrismaTransactionMock = {
  baseDeDados: BaseDeDadosDelegateMock;
  cliente: ClienteDelegateMock;
};

type TransactionInput =
  | Promise<unknown>[]
  | ((tx: PrismaTransactionMock) => Promise<unknown>);

type PrismaServiceMock = PrismaTransactionMock & {
  $transaction: jest.Mock;
};

type CsvParserMock = {
  parse: jest.Mock;
};

type ClientesServiceMock = {
  criaClientesDaBase: jest.Mock;
  revalidaClientesDaBase: jest.Mock;
  criaOuAtualizaClientesDaBase: jest.Mock;
};

describe('BaseDadosService', () => {
  let service: BaseDadosService;
  let prisma: PrismaTransactionMock;
  let prismaService: PrismaServiceMock;
  let csvParser: CsvParserMock;
  let clientesService: ClientesServiceMock;

  const estrutura: BaseDadosEstruturaDto[] = [
    {
      cabecalho: 'email',
      rotulo: 'Email',
      tipo: TipoCampo.EMAIL,
      obrigatorio: true,
    },
  ];

  const createDto: BaseDadosCreateDto = {
    nome: 'clientes',
    estrutura,
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

    csvParser = {
      parse: jest.fn(),
    };

    clientesService = {
      criaClientesDaBase: jest.fn(),
      revalidaClientesDaBase: jest.fn(),
      criaOuAtualizaClientesDaBase: jest.fn(),
    };

    service = new BaseDadosService(
      prismaService as never,
      csvParser as unknown as CsvParser,
      clientesService as unknown as ClientesService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('retornaTodos lista bases paginadas com select enxuto', async () => {
    const data = [
      {
        id: 1,
        nome: 'clientes',
        estrutura,
        integracao: null,
        usuario: { nome: 'Admin' },
        _count: { clientes: 2 },
      },
    ];
    const query: BaseDadosFindAllQueryDto = {
      page: 2,
      limit: 5,
      nome: 'clientes',
      orderBy: 'nome',
      order: 'asc',
    };

    prismaService.baseDeDados.findMany.mockResolvedValue(data);
    prismaService.baseDeDados.count.mockResolvedValue(12);

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

    expect(prismaService.baseDeDados.findMany).toHaveBeenCalledTimes(1);
    const [findManyArgs] = prismaService.baseDeDados.findMany.mock.calls[0] as [
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
      nome: true,
      estrutura: true,
      integracao: {
        select: {
          nome: true,
        },
      },
      usuario: {
        select: {
          nome: true,
        },
      },
      _count: {
        select: {
          clientes: true,
        },
      },
    });
    expect(prismaService.baseDeDados.count).toHaveBeenCalledTimes(1);
  });

  it('retornaTodosParaCampanha remove estrutura e monta campos', async () => {
    prismaService.baseDeDados.findMany.mockResolvedValue([
      {
        id: 1,
        nome: 'clientes',
        estrutura,
        integracao: null,
        usuario: { nome: 'Admin' },
        _count: { clientes: 2 },
      },
    ]);
    prismaService.baseDeDados.count.mockResolvedValue(1);

    await expect(service.retornaTodosParaCampanha({})).resolves.toEqual({
      data: [
        {
          id: 1,
          nome: 'clientes',
          integracao: null,
          usuario: { nome: 'Admin' },
          _count: { clientes: 2 },
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
    });
  });

  it('retornaPorId retorna base pelo id', async () => {
    const base = {
      id: 1,
      nome: 'clientes',
      integracao: null,
      usuario: { nome: 'Admin' },
      estrutura,
      _count: { clientes: 2 },
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    };
    prismaService.baseDeDados.findUnique.mockResolvedValue(base);

    await expect(service.retornaPorId(1)).resolves.toEqual(base);

    expect(prismaService.baseDeDados.findUnique).toHaveBeenCalledWith({
      where: { id: 1, deletedAt: null },
      select: {
        id: true,
        nome: true,
        integracao: {
          select: {
            nome: true,
          },
        },
        usuario: {
          select: {
            nome: true,
          },
        },
        estrutura: true,
        _count: {
          select: {
            clientes: true,
          },
        },
        createdAt: true,
        updatedAt: true,
      },
    });
  });

  it('retornaPorId retorna NotFoundException quando base nao existe', async () => {
    prismaService.baseDeDados.findUnique.mockResolvedValue(null);

    await expect(service.retornaPorId(1)).rejects.toThrow(NotFoundException);
  });

  it('garanteBaseDaIntegracao cria base quando nao existe', async () => {
    prisma.baseDeDados.findFirst.mockResolvedValue(null);
    prisma.baseDeDados.create.mockResolvedValue({ id: 10 });

    await expect(
      service.garanteBaseDaIntegracao(prisma as never, 5, 'IXC', [
        { nome: 'email', tipo: TipoCampo.EMAIL },
      ]),
    ).resolves.toBe(10);

    expect(prisma.baseDeDados.create).toHaveBeenCalledWith({
      data: {
        nome: 'IXC',
        estrutura: [
          {
            cabecalho: 'email',
            tipo: TipoCampo.EMAIL,
            obrigatorio: false,
            rotulo: null,
          },
        ] as unknown as Prisma.InputJsonValue,
        integracaoId: 5,
      },
      select: { id: true },
    });
  });

  it('garanteBaseDaIntegracao retorna base existente quando estrutura nao muda', async () => {
    prisma.baseDeDados.findFirst.mockResolvedValue({
      id: 10,
      estrutura: [
        {
          cabecalho: 'email',
          tipo: TipoCampo.EMAIL,
          rotulo: null,
          obrigatorio: false,
        },
      ],
    });

    await expect(
      service.garanteBaseDaIntegracao(prisma as never, 5, 'IXC', [
        { nome: 'email', tipo: TipoCampo.EMAIL },
      ]),
    ).resolves.toBe(10);

    expect(prisma.baseDeDados.update).not.toHaveBeenCalled();
  });

  it('garanteBaseDaIntegracao atualiza estrutura preservando configuracoes existentes', async () => {
    prisma.baseDeDados.findFirst.mockResolvedValue({
      id: 10,
      estrutura: [
        {
          cabecalho: 'email',
          tipo: TipoCampo.EMAIL,
          obrigatorio: true,
          rotulo: 'E-mail principal',
        },
      ],
    });
    prisma.baseDeDados.update.mockResolvedValue({ id: 10 });

    await expect(
      service.garanteBaseDaIntegracao(prisma as never, 5, 'IXC', [
        { nome: 'email', tipo: TipoCampo.EMAIL },
        { nome: 'nome', tipo: TipoCampo.TEXTO },
      ]),
    ).resolves.toBe(10);

    expect(prisma.baseDeDados.update).toHaveBeenCalledTimes(1);
    const [updateArgs] = prisma.baseDeDados.update.mock.calls[0] as [
      {
        where: { id: number };
        data: {
          nome: string;
          estrutura: BaseDadosEstruturaDto[];
          updatedAt: Date;
        };
        select: { id: boolean };
      },
    ];
    expect(updateArgs.where).toEqual({ id: 10 });
    expect(updateArgs.data.nome).toBe('IXC');
    expect(updateArgs.data.estrutura).toEqual([
      {
        cabecalho: 'email',
        tipo: TipoCampo.EMAIL,
        rotulo: 'E-mail principal',
        obrigatorio: true,
      },
      {
        cabecalho: 'nome',
        tipo: TipoCampo.TEXTO,
        rotulo: null,
        obrigatorio: false,
      },
    ]);
    expect(updateArgs.data.updatedAt).toBeInstanceOf(Date);
    expect(updateArgs.select).toEqual({ id: true });
  });

  it('salvaClientesDaBase delega persistencia para ClientesService', async () => {
    clientesService.criaOuAtualizaClientesDaBase.mockResolvedValue({
      criados: 2,
      atualizados: 1,
    });
    const linhas = [{ email: 'joao@example.com' }];

    await expect(
      service.salvaClientesDaBase(prisma as never, 1, estrutura, linhas, [
        'email',
      ]),
    ).resolves.toEqual({ criados: 2, atualizados: 1 });

    expect(clientesService.criaOuAtualizaClientesDaBase).toHaveBeenCalledWith(
      prisma,
      1,
      estrutura,
      linhas,
      ['email'],
    );
  });

  it('cria base a partir de csv e cria clientes', async () => {
    csvParser.parse.mockResolvedValue({
      list: [{ email: 'joao@example.com' }],
      total: 1,
    });
    prisma.baseDeDados.create.mockResolvedValue({ id: 10, nome: 'clientes' });
    clientesService.criaClientesDaBase.mockResolvedValue(undefined);

    await expect(
      service.cria(createDto, Buffer.from('email\njoao@example.com'), 99),
    ).resolves.toEqual({ id: 10 });

    expect(csvParser.parse).toHaveBeenCalledTimes(1);
    expect(prisma.baseDeDados.create).toHaveBeenCalledWith({
      data: {
        nome: 'clientes',
        estrutura: estrutura as unknown as Prisma.InputJsonValue,
        usuarioId: 99,
      },
      select: {
        id: true,
        nome: true,
      },
    });
    expect(clientesService.criaClientesDaBase).toHaveBeenCalledWith(
      prisma,
      10,
      estrutura,
      [{ email: 'joao@example.com' }],
    );
  });

  it('cria retorna BadRequestException quando csv esta vazio', async () => {
    await expect(service.cria(createDto, Buffer.from(''))).rejects.toThrow(
      BadRequestException,
    );

    expect(csvParser.parse).not.toHaveBeenCalled();
  });

  it('cria retorna BadRequestException quando parser falha', async () => {
    const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    csvParser.parse.mockRejectedValue(new Error('csv invalido'));

    await expect(
      service.cria(createDto, Buffer.from('email\njoao@example.com')),
    ).rejects.toThrow(BadRequestException);

    expect(prismaService.$transaction).not.toHaveBeenCalled();
    consoleLogSpy.mockRestore();
  });

  it('cria retorna BadRequestException quando csv nao possui linhas', async () => {
    csvParser.parse.mockResolvedValue({ list: [], total: 0 });

    await expect(
      service.cria(createDto, Buffer.from('email\n')),
    ).rejects.toThrow(BadRequestException);

    expect(prismaService.$transaction).not.toHaveBeenCalled();
  });

  it('atualiza nome sem revalidar clientes quando estrutura nao muda', async () => {
    prisma.baseDeDados.findFirst.mockResolvedValue({ id: 1 });
    prisma.baseDeDados.update.mockResolvedValue({ id: 1 });

    await expect(service.atualiza(1, { nome: 'clientes 2' })).resolves.toEqual({
      id: 1,
      revalidacaoClientes: 0,
      tipoFoiAlterado: false,
    });

    expectBaseUpdate(prisma.baseDeDados.update, {
      id: 1,
      nome: 'clientes 2',
      estrutura: undefined,
    });
    expect(clientesService.revalidaClientesDaBase).not.toHaveBeenCalled();
  });

  it('atualiza estrutura e revalida clientes', async () => {
    const updateDto: BaseDadosUpdateDto = { estrutura };
    prisma.baseDeDados.findFirst.mockResolvedValue({ id: 1 });
    prisma.baseDeDados.update.mockResolvedValue({ id: 1 });
    clientesService.revalidaClientesDaBase.mockResolvedValue(3);

    await expect(service.atualiza(1, updateDto)).resolves.toEqual({
      id: 1,
      revalidacaoClientes: 3,
      tipoFoiAlterado: true,
    });

    expectBaseUpdate(prisma.baseDeDados.update, {
      id: 1,
      nome: undefined,
      estrutura,
    });
    expect(clientesService.revalidaClientesDaBase).toHaveBeenCalledWith(
      prisma,
      1,
      estrutura,
    );
  });

  it('atualiza retorna BadRequestException quando dto nao possui campos', async () => {
    await expect(service.atualiza(1, {})).rejects.toThrow(BadRequestException);

    expect(prismaService.$transaction).not.toHaveBeenCalled();
  });

  it('atualiza retorna NotFoundException quando base nao existe', async () => {
    prisma.baseDeDados.findFirst.mockResolvedValue(null);

    await expect(service.atualiza(1, { nome: 'clientes' })).rejects.toThrow(
      NotFoundException,
    );

    expect(prisma.baseDeDados.update).not.toHaveBeenCalled();
  });

  it('exclui faz soft delete da base e dos clientes', async () => {
    prisma.baseDeDados.findFirst.mockResolvedValue({ id: 1 });
    prisma.baseDeDados.update.mockResolvedValue({ id: 1 });
    prisma.cliente.updateMany.mockResolvedValue({ count: 4 });

    await expect(service.exclui(1)).resolves.toEqual({
      id: 1,
      clientesSoftDeleted: 4,
    });

    expect(prisma.baseDeDados.update).toHaveBeenCalledTimes(1);
    expect(prisma.cliente.updateMany).toHaveBeenCalledTimes(1);

    const [baseUpdateArgs] = prisma.baseDeDados.update.mock.calls[0] as [
      {
        where: { id: number };
        data: {
          deletedAt: Date;
          updatedAt: Date;
        };
      },
    ];
    expect(baseUpdateArgs.where).toEqual({ id: 1 });
    expect(baseUpdateArgs.data.deletedAt).toBeInstanceOf(Date);
    expect(baseUpdateArgs.data.updatedAt).toBeInstanceOf(Date);

    const [clienteUpdateArgs] = prisma.cliente.updateMany.mock.calls[0] as [
      {
        where: {
          baseDeDadosId: number;
          deletedAt: null;
        };
        data: {
          deletedAt: Date;
          updatedAt: Date;
        };
      },
    ];
    expect(clienteUpdateArgs.where).toEqual({
      baseDeDadosId: 1,
      deletedAt: null,
    });
    expect(clienteUpdateArgs.data.deletedAt).toBeInstanceOf(Date);
    expect(clienteUpdateArgs.data.updatedAt).toBeInstanceOf(Date);
  });

  it('exclui retorna NotFoundException quando base nao existe', async () => {
    prisma.baseDeDados.findFirst.mockResolvedValue(null);

    await expect(service.exclui(1)).rejects.toThrow(NotFoundException);

    expect(prisma.baseDeDados.update).not.toHaveBeenCalled();
    expect(prisma.cliente.updateMany).not.toHaveBeenCalled();
  });

  it('retornaEstruturaPorId busca estrutura da base', async () => {
    prismaService.baseDeDados.findFirst.mockResolvedValue({
      id: 1,
      estrutura,
    });

    await expect(service.retornaEstruturaPorId(1)).resolves.toEqual({
      id: 1,
      estrutura,
    });

    expect(prismaService.baseDeDados.findFirst).toHaveBeenCalledWith({
      where: { id: 1, deletedAt: null },
      select: { id: true, estrutura: true },
    });
  });

  it('retornaEstruturasPorIds busca estruturas das bases', async () => {
    prismaService.baseDeDados.findMany.mockResolvedValue([
      { id: 1, estrutura },
    ]);

    await expect(service.retornaEstruturasPorIds([1, 2])).resolves.toEqual([
      { id: 1, estrutura },
    ]);

    expect(prismaService.baseDeDados.findMany).toHaveBeenCalledWith({
      where: { id: { in: [1, 2] }, deletedAt: null },
      select: { id: true, estrutura: true },
    });
  });
});

function createPrismaMock(): PrismaTransactionMock {
  return {
    baseDeDados: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    cliente: {
      updateMany: jest.fn(),
    },
  };
}

function expectBaseUpdate(
  update: jest.Mock,
  expected: {
    id: number;
    nome?: string;
    estrutura?: BaseDadosEstruturaDto[];
  },
): void {
  expect(update).toHaveBeenCalledTimes(1);

  const [args] = update.mock.calls[0] as [
    {
      where: { id: number };
      data: {
        nome?: string;
        estrutura?: BaseDadosEstruturaDto[];
        updatedAt: Date;
      };
    },
  ];

  expect(args.where).toEqual({ id: expected.id });
  expect(args.data.nome).toBe(expected.nome);
  expect(args.data.estrutura).toEqual(expected.estrutura);
  expect(args.data.updatedAt).toBeInstanceOf(Date);
}
