import { TipoCampo } from 'src/common/types/dados.types';
import { ClientesCriacaoService } from './cliente-criacao.service';

type ClienteDelegateMock = {
  createMany: jest.Mock;
  findMany: jest.Mock;
  update: jest.Mock;
};

type PrismaMock = {
  cliente: ClienteDelegateMock;
  $executeRaw: jest.Mock;
};

describe('ClientesCriacaoService', () => {
  let service: ClientesCriacaoService;
  let prisma: PrismaMock;

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
    prisma = {
      cliente: {
        createMany: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      $executeRaw: jest.fn(),
    };

    service = new ClientesCriacaoService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('criaOuAtualizaClientesDaBase retorna zero quando nao ha linhas', async () => {
    await expect(
      service.criaOuAtualizaClientesDaBase(prisma as never, 10, estrutura, []),
    ).resolves.toEqual({ criados: 0, atualizados: 0 });

    expect(prisma.cliente.createMany).not.toHaveBeenCalled();
  });

  it('criaOuAtualizaClientesDaBase cria todos quando nao ha identificadores', async () => {
    prisma.cliente.createMany.mockResolvedValue({ count: 2 });

    await expect(
      service.criaOuAtualizaClientesDaBase(prisma as never, 10, estrutura, [
        { email: 'joao@example.com', nome: 'Joao' },
        { email: 'maria@example.com', nome: 'Maria' },
      ]),
    ).resolves.toEqual({ criados: 2, atualizados: 0 });

    expect(prisma.cliente.createMany).toHaveBeenCalledTimes(1);
    const [args] = prisma.cliente.createMany.mock.calls[0] as [
      {
        data: Array<{
          baseDeDadosId: number;
          dados: Record<string, unknown>;
          validacao: unknown[];
          hash: string;
        }>;
      },
    ];
    expect(args.data).toHaveLength(2);
    expect(args.data[0].baseDeDadosId).toBe(10);
    expect(args.data[0].dados).toEqual({
      email: 'joao@example.com',
      nome: 'Joao',
    });
    expect(args.data[0].validacao).toEqual([]);
    expect(args.data[0].hash).toHaveLength(64);
  });

  it('criaOuAtualizaClientesDaBase cria e atualiza usando identificadores', async () => {
    prisma.cliente.findMany.mockResolvedValue([
      {
        id: 1,
        dados: {
          email: 'joao@example.com',
          nome: 'Joao antigo',
        },
      },
    ]);
    prisma.cliente.update.mockResolvedValue({ id: 1 });
    prisma.cliente.createMany.mockResolvedValue({ count: 1 });

    await expect(
      service.criaOuAtualizaClientesDaBase(
        prisma as never,
        10,
        estrutura,
        [
          { email: 'joao@example.com', nome: 'Joao novo' },
          { email: 'maria@example.com', nome: 'Maria' },
        ],
        [' email '],
      ),
    ).resolves.toEqual({ criados: 1, atualizados: 1 });

    expect(prisma.cliente.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.cliente.update).toHaveBeenCalledTimes(1);
    const [updateArgs] = prisma.cliente.update.mock.calls[0] as [
      {
        where: { id: number };
        data: {
          dados: Record<string, unknown>;
          validacao: unknown[];
          hash: string;
          updatedAt: Date;
        };
        select: { id: boolean };
      },
    ];
    expect(updateArgs.where).toEqual({ id: 1 });
    expect(updateArgs.data.dados).toEqual({
      email: 'joao@example.com',
      nome: 'Joao novo',
    });
    expect(updateArgs.data.updatedAt).toBeInstanceOf(Date);
    expect(prisma.cliente.createMany).toHaveBeenCalledTimes(1);
  });

  it('criaClientesDaBase cria clientes normalizados com skipDuplicates', async () => {
    prisma.cliente.createMany.mockResolvedValue({ count: 1 });

    await expect(
      service.criaClientesDaBase(prisma as never, 10, estrutura, [
        { email: 'joao@example.com', nome: 'Joao' },
      ]),
    ).resolves.toBe(true);

    expect(prisma.cliente.createMany).toHaveBeenCalledTimes(1);
    const [args] = prisma.cliente.createMany.mock.calls[0] as [
      {
        data: Array<{
          baseDeDadosId: number;
          dados: Record<string, unknown>;
          validacao: unknown[];
          hash: string;
        }>;
        skipDuplicates: boolean;
      },
    ];
    expect(args.skipDuplicates).toBe(true);
    expect(args.data[0]).toMatchObject({
      baseDeDadosId: 10,
      dados: {
        email: 'joao@example.com',
        nome: 'Joao',
      },
      validacao: [],
    });
    expect(args.data[0].hash).toHaveLength(64);
  });

  it('criaClientesDaBase retorna false quando nao ha linhas', async () => {
    await expect(
      service.criaClientesDaBase(prisma as never, 10, estrutura, []),
    ).resolves.toBe(false);

    expect(prisma.cliente.createMany).not.toHaveBeenCalled();
  });

  it('revalidaClientesDaBase atualiza clientes em lote via raw query', async () => {
    prisma.cliente.findMany.mockResolvedValue([
      {
        id: 1,
        dados: {
          email: 'joao@example.com',
          nome: 'Joao',
        },
      },
      {
        id: 2,
        dados: {
          email: 'email-invalido',
          nome: 'Maria',
        },
      },
    ]);
    prisma.$executeRaw.mockResolvedValue(2);

    await expect(
      service.revalidaClientesDaBase(prisma as never, 10, estrutura),
    ).resolves.toBe(2);

    expect(prisma.cliente.findMany).toHaveBeenCalledWith({
      where: {
        baseDeDadosId: 10,
        deletedAt: null,
      },
      select: {
        id: true,
        dados: true,
      },
    });
    expect(prisma.$executeRaw).toHaveBeenCalledTimes(1);
  });

  it('revalidaClientesDaBase divide raw update em lotes', async () => {
    const clientes = Array.from({ length: 1001 }, (_, index) => ({
      id: index + 1,
      dados: {
        email: `cliente${index}@example.com`,
        nome: `Cliente ${index}`,
      },
    }));

    prisma.cliente.findMany.mockResolvedValue(clientes);
    prisma.$executeRaw.mockResolvedValue(1000);

    await expect(
      service.revalidaClientesDaBase(prisma as never, 10, estrutura),
    ).resolves.toBe(1001);

    expect(prisma.$executeRaw).toHaveBeenCalledTimes(2);
  });

  it('geraHash gera o mesmo hash independentemente da ordem das chaves', () => {
    const primeiro = service.geraHash({ nome: 'Joao', email: 'a@example.com' });
    const segundo = service.geraHash({ email: 'a@example.com', nome: 'Joao' });

    expect(primeiro).toBe(segundo);
    expect(primeiro).toHaveLength(64);
  });
});
