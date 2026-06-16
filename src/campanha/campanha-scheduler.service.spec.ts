import { Logger } from '@nestjs/common';
import { PrismaService } from 'src/config/prisma.service';
import { CampanhaExecucaoService } from './campanha-execucao.service';
import { CampanhaSchedulerService } from './campanha-scheduler.service';
import { CampanhaReservada } from './types/campanha-job.type';
import { STATUS_CAMPANHA } from './types/campanha.type';

type TransactionClientMock = {
  $queryRaw: jest.Mock;
  campanha: {
    update: jest.Mock;
  };
};

type PrismaServiceMock = {
  $transaction: jest.Mock;
};

type CampanhaExecucaoServiceMock = {
  executaCampanha: jest.Mock;
};

describe('CampanhaSchedulerService', () => {
  let service: CampanhaSchedulerService;
  let prismaService: PrismaServiceMock;
  let transactionClient: TransactionClientMock;
  let campanhaExecucaoService: CampanhaExecucaoServiceMock;
  let loggerErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    loggerErrorSpy = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => {
        return undefined;
      });
    transactionClient = {
      $queryRaw: jest.fn(),
      campanha: {
        update: jest.fn(),
      },
    };
    prismaService = {
      $transaction: jest.fn(
        async (
          callback: (
            prisma: TransactionClientMock,
          ) => Promise<CampanhaReservada | null>,
        ) => callback(transactionClient),
      ),
    };
    campanhaExecucaoService = {
      executaCampanha: jest.fn(),
    };

    service = new CampanhaSchedulerService(
      campanhaExecucaoService as unknown as CampanhaExecucaoService,
      prismaService as unknown as PrismaService,
    );
  });

  afterEach(() => {
    loggerErrorSpy.mockRestore();
    jest.clearAllMocks();
  });

  it('executa campanhas pendentes reservadas ate nao haver proxima', async () => {
    transactionClient.$queryRaw
      .mockResolvedValueOnce([{ id: 1 }])
      .mockResolvedValueOnce([]);
    transactionClient.campanha.update.mockResolvedValue({ id: 1 });
    campanhaExecucaoService.executaCampanha.mockResolvedValue(undefined);

    await expect(service.executaCampanhasPendentes()).resolves.toBeUndefined();

    expect(prismaService.$transaction).toHaveBeenCalledTimes(2);
    expect(transactionClient.campanha.update).toHaveBeenCalledTimes(1);
    const [updateArgs] = transactionClient.campanha.update.mock.calls[0] as [
      {
        where: { id: number };
        data: {
          status: STATUS_CAMPANHA;
          executedAt: Date;
          updatedAt: Date;
        };
        select: { id: true };
      },
    ];
    expect(updateArgs.where).toEqual({ id: 1 });
    expect(updateArgs.data.status).toBe(STATUS_CAMPANHA.EM_ENVIO);
    expect(updateArgs.data.executedAt).toBeInstanceOf(Date);
    expect(updateArgs.data.updatedAt).toBeInstanceOf(Date);
    expect(campanhaExecucaoService.executaCampanha).toHaveBeenCalledWith(1);
  });

  it('retorna sem executar quando nao ha campanha pendente', async () => {
    transactionClient.$queryRaw.mockResolvedValue([]);

    await expect(service.executaCampanhasPendentes()).resolves.toBeUndefined();

    expect(transactionClient.campanha.update).not.toHaveBeenCalled();
    expect(campanhaExecucaoService.executaCampanha).not.toHaveBeenCalled();
  });

  it('para o loop quando a execucao da campanha falha', async () => {
    transactionClient.$queryRaw.mockResolvedValue([{ id: 1 }]);
    transactionClient.campanha.update.mockResolvedValue({ id: 1 });
    campanhaExecucaoService.executaCampanha.mockRejectedValue(
      new Error('falha'),
    );

    await expect(service.executaCampanhasPendentes()).resolves.toBeUndefined();

    expect(prismaService.$transaction).toHaveBeenCalledTimes(1);
    expect(campanhaExecucaoService.executaCampanha).toHaveBeenCalledWith(1);
  });
});
