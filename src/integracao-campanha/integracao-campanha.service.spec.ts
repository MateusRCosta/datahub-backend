import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AlteraStatus } from 'src/common/dto/altera-status.dto';
import { UpchatService } from './integracao/upchat.service';
import { IntegracaoCampanhaCreateDto } from './dto/integracao-campanha-create.dto';
import { IntegracaoCampanhaFindAllQueryDto } from './dto/integracao-campanha-find-all-query.dto';
import { IntegracaoCampanhaUpdateDto } from './dto/integracao-campanha-update.dto';
import { IntegracaoCampanhaService } from './integracao-campanha.service';
import { PROVEDOR_INTEGRACAO_CAMPANHA } from './types/provedor-integracao-campanha.type';
import { AtivaExecucao } from './types/execucao.type';

type IntegracaoCampanhaDelegateMock = {
  findMany: jest.Mock;
  count: jest.Mock;
  findFirst: jest.Mock;
  create: jest.Mock;
  updateMany: jest.Mock;
};

type PrismaTransactionMock = {
  integracaoCampanha: IntegracaoCampanhaDelegateMock;
};

type TransactionInput =
  | Promise<unknown>[]
  | ((tx: PrismaTransactionMock) => Promise<unknown>);

type PrismaServiceMock = PrismaTransactionMock & {
  $transaction: jest.Mock;
};

type UpchatServiceMock = {
  enviaMensagem: jest.Mock;
};

describe('IntegracaoCampanhaService', () => {
  let service: IntegracaoCampanhaService;
  let prisma: PrismaTransactionMock;
  let prismaService: PrismaServiceMock;
  let upchatService: UpchatServiceMock;

  const upchatConfig = {
    url: 'https://api.example.com',
    queueId: 1,
    apiKey: 'api-key',
  };

  const createDto: IntegracaoCampanhaCreateDto = {
    nome: 'Upchat',
    provedor: PROVEDOR_INTEGRACAO_CAMPANHA.UPCHAT,
    config: upchatConfig,
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

    upchatService = {
      enviaMensagem: jest.fn(),
    };

    service = new IntegracaoCampanhaService(
      prismaService as never,
      upchatService as unknown as UpchatService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('retornaTodos lista integracoes campanha paginadas com select enxuto', async () => {
    const data = [
      {
        id: 1,
        nome: 'Upchat',
        provedor: PROVEDOR_INTEGRACAO_CAMPANHA.UPCHAT,
        status: true,
        usuario: { nome: 'Admin' },
      },
    ];
    const query: IntegracaoCampanhaFindAllQueryDto = {
      page: 2,
      limit: 5,
      nome: 'Up',
      provedor: PROVEDOR_INTEGRACAO_CAMPANHA.UPCHAT,
      status: true,
      orderBy: 'nome',
      order: 'asc',
    };
    prismaService.integracaoCampanha.findMany.mockResolvedValue(data);
    prismaService.integracaoCampanha.count.mockResolvedValue(12);

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

    expect(prismaService.integracaoCampanha.findMany).toHaveBeenCalledTimes(1);
    const [findManyArgs] = prismaService.integracaoCampanha.findMany.mock
      .calls[0] as [
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
      provedor: true,
      status: true,
      usuario: {
        select: {
          nome: true,
        },
      },
    });
  });

  it('retornaTodosMinimizados lista somente campos minimizados ativos', async () => {
    const data = [
      {
        id: 1,
        nome: 'Upchat',
        provedor: PROVEDOR_INTEGRACAO_CAMPANHA.UPCHAT,
        status: true,
      },
    ];
    prismaService.integracaoCampanha.findMany.mockResolvedValue(data);
    prismaService.integracaoCampanha.count.mockResolvedValue(1);

    await expect(
      service.retornaTodosMinimizados({ nome: 'a' }),
    ).resolves.toEqual({
      data,
      meta: {
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    });

    const [findManyArgs] = prismaService.integracaoCampanha.findMany.mock
      .calls[0] as [
      {
        select: Record<string, unknown>;
      },
    ];
    expect(findManyArgs.select).toEqual({
      id: true,
      nome: true,
      provedor: true,
      status: true,
    });
  });

  it('retornaPorId retorna integracao campanha por id', async () => {
    const integracao = {
      id: 1,
      nome: 'Upchat',
      status: true,
      provedor: PROVEDOR_INTEGRACAO_CAMPANHA.UPCHAT,
      config: upchatConfig,
      usuario: { nome: 'Admin' },
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    };
    prismaService.integracaoCampanha.findFirst.mockResolvedValue(integracao);

    await expect(service.retornaPorId(1)).resolves.toEqual(integracao);

    expect(prismaService.integracaoCampanha.findFirst).toHaveBeenCalledWith({
      where: { id: 1, deletedAt: null },
      select: {
        id: true,
        nome: true,
        status: true,
        provedor: true,
        config: true,
        usuario: {
          select: {
            nome: true,
          },
        },
        createdAt: true,
        updatedAt: true,
      },
    });
  });

  it('retornaPorId retorna NotFoundException quando nao existe', async () => {
    prismaService.integracaoCampanha.findFirst.mockResolvedValue(null);

    await expect(service.retornaPorId(1)).rejects.toThrow(NotFoundException);
  });

  it('cria integracao campanha', async () => {
    prismaService.integracaoCampanha.create.mockResolvedValue({ id: 1 });

    await expect(service.cria(createDto, 99)).resolves.toEqual({ id: 1 });

    expect(prismaService.integracaoCampanha.create).toHaveBeenCalledWith({
      data: {
        nome: 'Upchat',
        provedor: PROVEDOR_INTEGRACAO_CAMPANHA.UPCHAT,
        config: upchatConfig as unknown as Prisma.InputJsonValue,
        usuarioId: 99,
      },
      select: { id: true },
    });
  });

  it('atualiza integracao campanha preservando provedor', async () => {
    const updateDto: IntegracaoCampanhaUpdateDto = {
      nome: 'Upchat novo',
      provedor: PROVEDOR_INTEGRACAO_CAMPANHA.UPCHAT,
      config: upchatConfig,
    };
    prisma.integracaoCampanha.findFirst.mockResolvedValue({
      id: 1,
      provedor: PROVEDOR_INTEGRACAO_CAMPANHA.UPCHAT,
    });
    prisma.integracaoCampanha.updateMany.mockResolvedValue({ count: 1 });

    await expect(service.atualiza(1, updateDto)).resolves.toBeUndefined();

    expect(prisma.integracaoCampanha.updateMany).toHaveBeenCalledTimes(1);
    const [updateArgs] = prisma.integracaoCampanha.updateMany.mock.calls[0] as [
      {
        where: { id: number; deletedAt: null };
        data: {
          nome?: string;
          provedor?: PROVEDOR_INTEGRACAO_CAMPANHA;
          config?: Prisma.InputJsonValue;
          updatedAt: Date;
        };
      },
    ];
    expect(updateArgs.where).toEqual({ id: 1, deletedAt: null });
    expect(updateArgs.data.nome).toBe('Upchat novo');
    expect(updateArgs.data.provedor).toBe(PROVEDOR_INTEGRACAO_CAMPANHA.UPCHAT);
    expect(updateArgs.data.config).toEqual(upchatConfig);
    expect(updateArgs.data.updatedAt).toBeInstanceOf(Date);
  });

  it('atualiza retorna BadRequestException quando dto nao possui campos', async () => {
    const dtoVazio = {} as IntegracaoCampanhaUpdateDto;

    await expect(service.atualiza(1, dtoVazio)).rejects.toThrow(
      BadRequestException,
    );

    expect(prismaService.$transaction).not.toHaveBeenCalled();
  });

  it('atualiza retorna NotFoundException quando integracao nao existe', async () => {
    prisma.integracaoCampanha.findFirst.mockResolvedValue(null);

    await expect(service.atualiza(1, { nome: 'Upchat novo' })).rejects.toThrow(
      NotFoundException,
    );

    expect(prisma.integracaoCampanha.updateMany).not.toHaveBeenCalled();
  });

  it('atualiza bloqueia mudanca de provedor', async () => {
    prisma.integracaoCampanha.findFirst.mockResolvedValue({
      id: 1,
      provedor: PROVEDOR_INTEGRACAO_CAMPANHA.UPCHAT,
    });

    await expect(
      service.atualiza(1, {
        nome: 'a',
        provedor: PROVEDOR_INTEGRACAO_CAMPANHA.EMAIL,
        config: { email: 'contato@example.com' },
      }),
    ).rejects.toThrow(BadRequestException);

    expect(prisma.integracaoCampanha.updateMany).not.toHaveBeenCalled();
  });

  it('atualiza retorna NotFoundException quando update nao altera linhas', async () => {
    prisma.integracaoCampanha.findFirst.mockResolvedValue({
      id: 1,
      provedor: PROVEDOR_INTEGRACAO_CAMPANHA.UPCHAT,
    });
    prisma.integracaoCampanha.updateMany.mockResolvedValue({ count: 0 });

    await expect(service.atualiza(1, { nome: 'Upchat novo' })).rejects.toThrow(
      NotFoundException,
    );
  });

  it('exclui faz soft delete', async () => {
    prismaService.integracaoCampanha.updateMany.mockResolvedValue({ count: 1 });

    await expect(service.exclui(1)).resolves.toEqual({ id: 1 });

    expect(prismaService.integracaoCampanha.updateMany).toHaveBeenCalledTimes(
      1,
    );
    const [args] = prismaService.integracaoCampanha.updateMany.mock
      .calls[0] as [
      {
        where: { id: number; deletedAt: null };
        data: { deletedAt: Date };
      },
    ];
    expect(args.where).toEqual({ id: 1, deletedAt: null });
    expect(args.data.deletedAt).toBeInstanceOf(Date);
  });

  it('exclui retorna NotFoundException quando nao altera linhas', async () => {
    prismaService.integracaoCampanha.updateMany.mockResolvedValue({ count: 0 });

    await expect(service.exclui(1)).rejects.toThrow(NotFoundException);
  });

  it('atualizaStatus altera status', async () => {
    const statusDto: AlteraStatus = { status: false };
    prismaService.integracaoCampanha.updateMany.mockResolvedValue({ count: 1 });

    await expect(service.atualizaStatus(1, statusDto.status)).resolves.toEqual({
      id: 1,
    });

    expect(prismaService.integracaoCampanha.updateMany).toHaveBeenCalledTimes(
      1,
    );
    const [args] = prismaService.integracaoCampanha.updateMany.mock
      .calls[0] as [
      {
        where: { id: number; deletedAt: null };
        data: { status: boolean; updatedAt: Date };
      },
    ];
    expect(args.where).toEqual({ id: 1, deletedAt: null });
    expect(args.data.status).toBe(false);
    expect(args.data.updatedAt).toBeInstanceOf(Date);
  });

  it('atualizaStatus retorna NotFoundException quando nao altera linhas', async () => {
    prismaService.integracaoCampanha.updateMany.mockResolvedValue({ count: 0 });

    await expect(service.atualizaStatus(1, true)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('retornaProvedorPorId retorna provedor', async () => {
    prismaService.integracaoCampanha.findFirst.mockResolvedValue({
      id: 1,
      provedor: PROVEDOR_INTEGRACAO_CAMPANHA.UPCHAT,
    });

    await expect(service.retornaProvedorPorId(1)).resolves.toBe(
      PROVEDOR_INTEGRACAO_CAMPANHA.UPCHAT,
    );

    expect(prismaService.integracaoCampanha.findFirst).toHaveBeenCalledWith({
      where: { id: 1, deletedAt: null },
      select: { id: true, provedor: true },
    });
  });

  it('retornaProvedorPorId retorna NotFoundException quando nao existe', async () => {
    prismaService.integracaoCampanha.findFirst.mockResolvedValue(null);

    await expect(service.retornaProvedorPorId(1)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('executa envia mensagem via Upchat', async () => {
    const dto: AtivaExecucao = {
      provedor: PROVEDOR_INTEGRACAO_CAMPANHA.UPCHAT,
      config: upchatConfig,
      clientes: [],
      templateConfig: {
        id: 10,
        tituloTemplate: 'Titulo',
        mensagemTemplate: 'Mensagem',
        rodapeTemplate: 'Rodape',
        botoes: [],
      },
      nomeCampanha: 'Campanha',
    };
    upchatService.enviaMensagem.mockResolvedValue(undefined);

    await expect(service.executa(dto)).resolves.toBeUndefined();

    expect(upchatService.enviaMensagem).toHaveBeenCalledWith(dto);
  });
});

function createPrismaMock(): PrismaTransactionMock {
  return {
    integracaoCampanha: {
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
    },
  };
}
