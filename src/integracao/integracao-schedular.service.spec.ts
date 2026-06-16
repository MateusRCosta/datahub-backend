import { Job } from '@prisma/client';
import { IntegracaoService } from './integracao.service';
import { IntegracaoSchedularService } from './integracao-schedular.service';
import { STATUS_JOB } from './types/integracao.type';

type JobDelegateMock = {
  create: jest.Mock;
  deleteMany: jest.Mock;
  update: jest.Mock;
};

type PrismaTransactionMock = {
  $queryRaw: jest.Mock;
  job: JobDelegateMock;
};

type PrismaServiceMock = PrismaTransactionMock & {
  $transaction: jest.Mock;
};

type IntegracaoServiceMock = {
  executa: jest.Mock;
};

describe('IntegracaoSchedularService', () => {
  let service: IntegracaoSchedularService;
  let prisma: PrismaTransactionMock;
  let prismaService: PrismaServiceMock;
  let integracaoService: IntegracaoServiceMock;

  beforeEach(() => {
    prisma = createPrismaMock();
    prismaService = {
      ...createPrismaMock(),
      $transaction: jest.fn(
        (callback: (tx: PrismaTransactionMock) => Promise<unknown>) =>
          callback(prisma),
      ),
    };
    integracaoService = {
      executa: jest.fn(),
    };

    service = new IntegracaoSchedularService(
      integracaoService as unknown as IntegracaoService,
      prismaService as never,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('executaJobsPendentes processa jobs ate nao haver pendentes', async () => {
    const pegaProximoJobPendenteSpy = jest
      .spyOn(service, 'pegaProximoJobPendente')
      .mockResolvedValueOnce({ id: 1, integracaoId: 10 })
      .mockResolvedValueOnce({ id: 2, integracaoId: 20 })
      .mockResolvedValueOnce(null);

    await expect(service.executaJobsPendentes()).resolves.toBeUndefined();

    expect(pegaProximoJobPendenteSpy).toHaveBeenCalledTimes(3);
    expect(integracaoService.executa).toHaveBeenNthCalledWith(1, 10, 1);
    expect(integracaoService.executa).toHaveBeenNthCalledWith(2, 20, 2);
  });

  it('agendaIntegracao cancela pendentes e cria novo job', async () => {
    const job = buildJob({
      id: 1,
      integracaoId: 10,
      status: STATUS_JOB.PENDENTE,
    });
    prismaService.job.create.mockResolvedValue(job);

    await expect(
      service.agendaIntegracao({ id: 10, horaExecucao: 4 }),
    ).resolves.toEqual(job);

    expect(prismaService.job.deleteMany).toHaveBeenCalledWith({
      where: {
        integracaoId: 10,
        tipo: 'cliente',
        status: STATUS_JOB.PENDENTE,
      },
    });
    expect(prismaService.job.create).toHaveBeenCalledTimes(1);
    const [createArgs] = prismaService.job.create.mock.calls[0] as [
      {
        data: {
          integracaoId: number;
          tipo: string;
          status: STATUS_JOB;
          scheduledAt: Date;
        };
      },
    ];
    expect(createArgs.data.integracaoId).toBe(10);
    expect(createArgs.data.tipo).toBe('cliente');
    expect(createArgs.data.status).toBe(STATUS_JOB.PENDENTE);
    expect(createArgs.data.scheduledAt).toBeInstanceOf(Date);
  });

  it('aplicaAgendamentoPorStatus cancela quando status false', async () => {
    await expect(
      service.aplicaAgendamentoPorStatus({ id: 10, horaExecucao: 4 }, false),
    ).resolves.toBeUndefined();

    expect(prismaService.job.deleteMany).toHaveBeenCalledWith({
      where: {
        integracaoId: 10,
        tipo: 'cliente',
        status: STATUS_JOB.PENDENTE,
      },
    });
    expect(prismaService.job.create).not.toHaveBeenCalled();
  });

  it('aplicaAgendamentoPorStatus agenda quando status true', async () => {
    prismaService.job.create.mockResolvedValue(buildJob({ id: 1 }));

    await expect(
      service.aplicaAgendamentoPorStatus({ id: 10, horaExecucao: 4 }, true),
    ).resolves.toBeUndefined();

    expect(prismaService.job.create).toHaveBeenCalledTimes(1);
  });

  it('cancelaAgendamento remove jobs pendentes da integracao', async () => {
    prismaService.job.deleteMany.mockResolvedValue({ count: 1 });

    await expect(service.cancelaAgendamento(10)).resolves.toBeUndefined();

    expect(prismaService.job.deleteMany).toHaveBeenCalledWith({
      where: {
        integracaoId: 10,
        tipo: 'cliente',
        status: STATUS_JOB.PENDENTE,
      },
    });
  });

  it('pegaProximoJobPendente retorna null quando nao ha job', async () => {
    prisma.$queryRaw.mockResolvedValue([]);

    await expect(service.pegaProximoJobPendente()).resolves.toBeNull();

    expect(prisma.job.update).not.toHaveBeenCalled();
  });

  it('pegaProximoJobPendente reserva job pendente', async () => {
    prisma.$queryRaw.mockResolvedValue([{ id: 1, integracaoId: 10 }]);
    prisma.job.update.mockResolvedValue({ id: 1, integracaoId: 10 });

    await expect(service.pegaProximoJobPendente()).resolves.toEqual({
      id: 1,
      integracaoId: 10,
    });

    expect(prisma.job.update).toHaveBeenCalledTimes(1);
    const [updateArgs] = prisma.job.update.mock.calls[0] as [
      {
        where: { id: number };
        data: {
          status: STATUS_JOB;
          executedAt: Date;
          finishedAt: null;
        };
        select: {
          id: boolean;
          integracaoId: boolean;
        };
      },
    ];
    expect(updateArgs.where).toEqual({ id: 1 });
    expect(updateArgs.data.status).toBe(STATUS_JOB.RODANDO);
    expect(updateArgs.data.executedAt).toBeInstanceOf(Date);
    expect(updateArgs.data.finishedAt).toBeNull();
    expect(updateArgs.select).toEqual({ id: true, integracaoId: true });
  });

  it('pegaProximoJobPendente retorna null quando job reservado nao tem integracaoId', async () => {
    prisma.$queryRaw.mockResolvedValue([{ id: 1, integracaoId: 10 }]);
    prisma.job.update.mockResolvedValue({ id: 1, integracaoId: null });

    await expect(service.pegaProximoJobPendente()).resolves.toBeNull();
  });

  it('atualizaStatus atualiza job e reagenda quando status finaliza execucao', async () => {
    const job = buildJob({
      id: 1,
      status: STATUS_JOB.COMPLETO,
      integracao: {
        id: 10,
        horaExecucao: 4,
        status: true,
        deletedAt: null,
      },
    });
    prismaService.job.update.mockResolvedValue(job);
    prismaService.job.create.mockResolvedValue(buildJob({ id: 2 }));

    await expect(service.atualizaStatus(1, STATUS_JOB.COMPLETO)).resolves.toBe(
      job,
    );

    expect(prismaService.job.update).toHaveBeenCalledTimes(1);
    const [updateArgs] = prismaService.job.update.mock.calls[0] as [
      {
        where: { id: number };
        data: {
          status: STATUS_JOB;
          finishedAt: Date;
        };
        include: unknown;
      },
    ];
    expect(updateArgs.where).toEqual({ id: 1 });
    expect(updateArgs.data.status).toBe(STATUS_JOB.COMPLETO);
    expect(updateArgs.data.finishedAt).toBeInstanceOf(Date);
    expect(prismaService.job.create).toHaveBeenCalledTimes(1);
  });

  it('atualizaStatus nao reagenda quando status nao finaliza execucao', async () => {
    const job = buildJob({ id: 1, status: STATUS_JOB.PENDENTE });
    prismaService.job.update.mockResolvedValue(job);

    await expect(service.atualizaStatus(1, STATUS_JOB.PENDENTE)).resolves.toBe(
      job,
    );

    expect(prismaService.job.create).not.toHaveBeenCalled();
  });
});

function createPrismaMock(): PrismaTransactionMock {
  return {
    $queryRaw: jest.fn(),
    job: {
      create: jest.fn(),
      deleteMany: jest.fn(),
      update: jest.fn(),
    },
  };
}

function buildJob(overrides: Partial<Job> & Record<string, unknown>): Job {
  return {
    id: 1,
    integracaoId: 10,
    tipo: 'cliente',
    status: STATUS_JOB.PENDENTE,
    scheduledAt: new Date('2026-01-01T00:00:00.000Z'),
    executedAt: null,
    finishedAt: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  } as Job;
}
