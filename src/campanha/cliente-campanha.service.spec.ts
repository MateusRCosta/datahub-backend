import { PrismaService } from 'src/config/prisma.service';
import { ClienteCampanhaService } from './cliente-campanha.service';
import { STATUS_CLIENTE_CAMPANHA } from './types/cliente-campanha.type';

type ClienteCampanhaDelegateMock = {
  findMany: jest.Mock;
  count: jest.Mock;
  createMany: jest.Mock;
  updateMany: jest.Mock;
};

type PrismaServiceMock = {
  clienteCampanha: ClienteCampanhaDelegateMock;
  $transaction: jest.Mock;
};

describe('ClienteCampanhaService', () => {
  let service: ClienteCampanhaService;
  let prismaService: PrismaServiceMock;

  beforeEach(() => {
    prismaService = {
      clienteCampanha: {
        findMany: jest.fn(),
        count: jest.fn(),
        createMany: jest.fn(),
        updateMany: jest.fn(),
      },
      $transaction: jest.fn((input: Promise<unknown>[]) => Promise.all(input)),
    };

    service = new ClienteCampanhaService(
      prismaService as unknown as PrismaService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('findClientes retorna clientes paginados da campanha', async () => {
    const data = [
      {
        id: 1,
        status: STATUS_CLIENTE_CAMPANHA.PENDENTE,
        clienteId: 10,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: null,
        cliente: { id: 10, dados: { nome: 'Joao' } },
      },
    ];
    prismaService.clienteCampanha.findMany.mockResolvedValue(data);
    prismaService.clienteCampanha.count.mockResolvedValue(12);

    await expect(
      service.findClientes(1, {
        clienteId: 10,
        status: STATUS_CLIENTE_CAMPANHA.PENDENTE,
        page: 2,
        limit: 5,
      }),
    ).resolves.toEqual({
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

    const [findManyArgs] = prismaService.clienteCampanha.findMany.mock
      .calls[0] as [
      {
        where: {
          campanhaId: number;
          clienteId?: number;
          status?: STATUS_CLIENTE_CAMPANHA;
        };
        skip: number;
        take: number;
        orderBy: { createdAt: string };
      },
    ];
    expect(findManyArgs.where).toEqual({
      campanhaId: 1,
      clienteId: 10,
      status: STATUS_CLIENTE_CAMPANHA.PENDENTE,
    });
    expect(findManyArgs.skip).toBe(5);
    expect(findManyArgs.take).toBe(5);
    expect(findManyArgs.orderBy).toEqual({ createdAt: 'desc' });
  });

  it('criaClientesCampanha ignora lista vazia', async () => {
    await expect(service.criaClientesCampanha(1, [])).resolves.toBeUndefined();

    expect(prismaService.clienteCampanha.createMany).not.toHaveBeenCalled();
  });

  it('criaClientesCampanha cria registros pendentes em lote', async () => {
    prismaService.clienteCampanha.createMany.mockResolvedValue({ count: 2 });

    await expect(
      service.criaClientesCampanha(1, [10, 20]),
    ).resolves.toBeUndefined();

    expect(prismaService.clienteCampanha.createMany).toHaveBeenCalledWith({
      data: [
        {
          status: STATUS_CLIENTE_CAMPANHA.PENDENTE,
          campanhaId: 1,
          clienteId: 10,
        },
        {
          status: STATUS_CLIENTE_CAMPANHA.PENDENTE,
          campanhaId: 1,
          clienteId: 20,
        },
      ],
      skipDuplicates: true,
    });
  });

  it('buscaClientesPendentes busca lote ordenado por id', async () => {
    const pendentes = [{ id: 1, cliente: { id: 10, dados: { nome: 'Joao' } } }];
    prismaService.clienteCampanha.findMany.mockResolvedValue(pendentes);

    await expect(service.buscaClientesPendentes(1)).resolves.toEqual(pendentes);

    expect(prismaService.clienteCampanha.findMany).toHaveBeenCalledWith({
      where: {
        campanhaId: 1,
        status: STATUS_CLIENTE_CAMPANHA.PENDENTE,
      },
      take: 100,
      orderBy: { id: 'asc' },
      select: {
        id: true,
        cliente: {
          select: {
            id: true,
            dados: true,
          },
        },
      },
    });
  });

  it('atualizaStatusClientes ignora lista vazia', async () => {
    await expect(
      service.atualizaStatusClientes([], STATUS_CLIENTE_CAMPANHA.ENVIADO),
    ).resolves.toBeUndefined();

    expect(prismaService.clienteCampanha.updateMany).not.toHaveBeenCalled();
  });

  it('atualizaStatusClientes atualiza ids informados', async () => {
    prismaService.clienteCampanha.updateMany.mockResolvedValue({ count: 2 });

    await expect(
      service.atualizaStatusClientes([1, 2], STATUS_CLIENTE_CAMPANHA.ENVIADO),
    ).resolves.toBeUndefined();

    const [args] = prismaService.clienteCampanha.updateMany.mock.calls[0] as [
      {
        where: { id: { in: number[] } };
        data: { status: STATUS_CLIENTE_CAMPANHA; updatedAt: Date };
      },
    ];
    expect(args.where).toEqual({ id: { in: [1, 2] } });
    expect(args.data.status).toBe(STATUS_CLIENTE_CAMPANHA.ENVIADO);
    expect(args.data.updatedAt).toBeInstanceOf(Date);
  });

  it('cancelaPendentes cancela pendentes e em envio', async () => {
    prismaService.clienteCampanha.updateMany.mockResolvedValue({ count: 2 });

    await expect(service.cancelaPendentes(1)).resolves.toBeUndefined();

    const [args] = prismaService.clienteCampanha.updateMany.mock.calls[0] as [
      {
        where: {
          campanhaId: number;
          status: { in: STATUS_CLIENTE_CAMPANHA[] };
        };
        data: { status: STATUS_CLIENTE_CAMPANHA; updatedAt: Date };
      },
    ];
    expect(args.where.campanhaId).toBe(1);
    expect(args.where.status.in).toEqual([
      STATUS_CLIENTE_CAMPANHA.PENDENTE,
      STATUS_CLIENTE_CAMPANHA.EM_ENVIO,
    ]);
    expect(args.data.status).toBe(STATUS_CLIENTE_CAMPANHA.CANCELADO);
    expect(args.data.updatedAt).toBeInstanceOf(Date);
  });

  it('contaPendentesOuEmEnvio conta clientes nao finalizados', async () => {
    prismaService.clienteCampanha.count.mockResolvedValue(3);

    await expect(service.contaPendentesOuEmEnvio(1)).resolves.toBe(3);

    expect(prismaService.clienteCampanha.count).toHaveBeenCalledWith({
      where: {
        campanhaId: 1,
        status: {
          in: [
            STATUS_CLIENTE_CAMPANHA.PENDENTE,
            STATUS_CLIENTE_CAMPANHA.EM_ENVIO,
          ],
        },
      },
    });
  });
});
