import {
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Integracao } from '@prisma/client';
import { AlteraStatus } from 'src/common/dto/altera-status.dto';
import { TipoCampo } from 'src/common/types/dados.types';
import { IntegracaoExecucaoService } from './integracao-execucao.service';
import { IntegracaoSchedularService } from './integracao-schedular.service';
import { IntegracaoService } from './integracao.service';
import { IntegracaoCreateDto } from './dto/integracao-create-dto';
import { IntegracaoFindAllQueryDto } from './dto/integracao-find-all-query.dto';
import { IntegracaoUpdateDto } from './dto/integracao-update-dto';
import { METODO, STATUS_JOB } from './types/integracao.type';
import { IntegracaoResponseDto } from './dto/integracao-response-dto';

type IntegracaoDelegateMock = {
  findMany: jest.Mock;
  count: jest.Mock;
  findFirst: jest.Mock;
  create: jest.Mock;
  updateMany: jest.Mock;
  updateManyAndReturn: jest.Mock;
};

type PrismaServiceMock = {
  integracao: IntegracaoDelegateMock;
  $transaction: jest.Mock;
};

type IntegracaoExecucaoServiceMock = {
  ativa: jest.Mock;
  executa: jest.Mock;
};

type IntegracaoSchedularServiceMock = {
  aplicaAgendamentoPorStatus: jest.Mock;
  atualizaStatus: jest.Mock;
};

describe('IntegracaoService', () => {
  let service: IntegracaoService;
  let prismaService: PrismaServiceMock;
  let integracaoExecucaoService: IntegracaoExecucaoServiceMock;
  let integracaoSchedularService: IntegracaoSchedularServiceMock;

  const createDto: IntegracaoCreateDto = {
    nome: 'Scrapping clientes',
    limitDeRequisicaoPorMin: 10,
    horaExecucao: 4,
    urlAuth: undefined as unknown as string,
    metodoAuth: undefined as unknown as METODO,
    headersAuth: [],
    bodyAuth: undefined as unknown as string,
    responseAuth: [],
    variaveisAuth: [],
    urlRefresh: undefined as unknown as string,
    metodoRefresh: undefined as unknown as METODO,
    headersRefresh: [],
    bodyRefresh: undefined as unknown as string,
    responseRefresh: [],
    variaveisRefresh: [],
    urlScrap: 'https://api.example.com/clientes',
    metodoScrap: METODO.GET,
    headersScrap: [],
    bodyScrap: undefined as unknown as string,
    responseScrap: [] as unknown as IntegracaoResponseDto[],
    variaveisScrap: [],
  };

  beforeEach(() => {
    prismaService = {
      integracao: {
        findMany: jest.fn(),
        count: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        updateMany: jest.fn(),
        updateManyAndReturn: jest.fn(),
      },
      $transaction: jest.fn((input: Promise<unknown>[]) => Promise.all(input)),
    };

    integracaoExecucaoService = {
      ativa: jest.fn(),
      executa: jest.fn(),
    };

    integracaoSchedularService = {
      aplicaAgendamentoPorStatus: jest.fn(),
      atualizaStatus: jest.fn(),
    };

    service = new IntegracaoService(
      prismaService as never,
      integracaoExecucaoService as unknown as IntegracaoExecucaoService,
      integracaoSchedularService as unknown as IntegracaoSchedularService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('retornaTodos lista integracoes paginadas com select enxuto', async () => {
    const data = [
      {
        id: 1,
        nome: 'Scrapping clientes',
        usuario: { nome: 'Admin' },
        status: true,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-02T00:00:00.000Z'),
      },
    ];
    const query: IntegracaoFindAllQueryDto = {
      page: 2,
      limit: 5,
      nome: 'Scrapping',
      orderBy: 'nome',
      order: 'asc',
    };
    prismaService.integracao.findMany.mockResolvedValue(data);
    prismaService.integracao.count.mockResolvedValue(12);

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

    expect(prismaService.integracao.findMany).toHaveBeenCalledTimes(1);
    const [findManyArgs] = prismaService.integracao.findMany.mock.calls[0] as [
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
      usuario: { select: { nome: true } },
      status: true,
      createdAt: true,
      updatedAt: true,
    });
  });

  it('retornaPorId retorna integracao por id', async () => {
    const integracao = buildIntegracao({ id: 1 });
    prismaService.integracao.findFirst.mockResolvedValue(integracao);

    await expect(service.retornaPorId(1)).resolves.toEqual(integracao);

    expect(prismaService.integracao.findFirst).toHaveBeenCalledTimes(1);
    const [findFirstArgs] = prismaService.integracao.findFirst.mock
      .calls[0] as [
      {
        where: { id: number; deletedAt: null };
        select: Record<string, unknown>;
      },
    ];
    expect(findFirstArgs.where).toEqual({ id: 1, deletedAt: null });
    expect(findFirstArgs.select.id).toBe(true);
    expect(findFirstArgs.select.nome).toBe(true);
    expect(findFirstArgs.select.responseScrap).toBe(true);
  });

  it('retornaPorId retorna NotFoundException quando integracao nao existe', async () => {
    prismaService.integracao.findFirst.mockResolvedValue(null);

    await expect(service.retornaPorId(1)).rejects.toThrow(NotFoundException);
  });

  it('cria integracao com status false e jsons convertidos', async () => {
    prismaService.integracao.create.mockResolvedValue({ id: 1 });

    await expect(service.cria(createDto, 99)).resolves.toEqual({ id: 1 });

    expect(prismaService.integracao.create).toHaveBeenCalledTimes(1);
    const [args] = prismaService.integracao.create.mock.calls[0] as [
      {
        data: Record<string, unknown>;
        select: { id: boolean };
      },
    ];
    expect(args.data).toMatchObject({
      nome: createDto.nome,
      limitDeRequisicaoPorMin: 10,
      horaExecucao: 4,
      urlScrap: createDto.urlScrap,
      metodoScrap: METODO.GET,
      responseScrap: createDto.responseScrap,
      usuarioId: 99,
      status: false,
    });
    expect(args.select).toEqual({ id: true });
  });

  it('cria converte falhas em InternalServerErrorException', async () => {
    jest.spyOn(console, 'error').mockImplementation();
    prismaService.integracao.create.mockRejectedValue(new Error('db error'));

    await expect(service.cria(createDto, 99)).rejects.toThrow(
      InternalServerErrorException,
    );
  });

  it('atualiza integracao e reaplica agendamento quando horario muda e status ativo', async () => {
    const integracao = buildIntegracao({
      id: 1,
      status: true,
      horaExecucao: 4,
    });
    prismaService.integracao.findFirst.mockResolvedValue(integracao);
    prismaService.integracao.updateManyAndReturn.mockResolvedValue([
      { horaExecucao: 5 },
    ]);
    const updateDto: IntegracaoUpdateDto = {
      horaExecucao: 5,
    } as IntegracaoUpdateDto;

    await expect(service.atualiza(updateDto, 99, 1)).resolves.toEqual({
      id: 1,
    });

    expect(prismaService.integracao.updateManyAndReturn).toHaveBeenCalledWith({
      where: { id: 1, deletedAt: null },
      data: { horaExecucao: 5 },
      select: { horaExecucao: true },
    });
    expect(
      integracaoSchedularService.aplicaAgendamentoPorStatus,
    ).toHaveBeenCalledWith(
      {
        ...integracao,
        horaExecucao: 5,
      },
      true,
    );
  });

  it('atualiza nao reaplica agendamento quando horario nao muda', async () => {
    prismaService.integracao.findFirst.mockResolvedValue(
      buildIntegracao({ id: 1, status: true, horaExecucao: 4 }),
    );
    prismaService.integracao.updateManyAndReturn.mockResolvedValue([
      { horaExecucao: 4 },
    ]);

    await expect(
      service.atualiza({ nome: 'Novo nome' } as IntegracaoUpdateDto, 99, 1),
    ).resolves.toEqual({ id: 1 });

    expect(
      integracaoSchedularService.aplicaAgendamentoPorStatus,
    ).not.toHaveBeenCalled();
  });

  it('atualiza retorna NotFoundException quando integracao nao existe', async () => {
    prismaService.integracao.findFirst.mockResolvedValue(null);

    await expect(
      service.atualiza({ nome: 'Novo' } as IntegracaoUpdateDto, 99, 1),
    ).rejects.toThrow(NotFoundException);
  });

  it('atualiza converte falhas inesperadas em InternalServerErrorException', async () => {
    jest.spyOn(console, 'error').mockImplementation();
    prismaService.integracao.findFirst.mockRejectedValue(new Error('db error'));

    await expect(
      service.atualiza({ nome: 'Novo' } as IntegracaoUpdateDto, 99, 1),
    ).rejects.toThrow(InternalServerErrorException);
  });

  it('exclui cancela agendamento e faz soft delete', async () => {
    const integracao = buildIntegracao({ id: 1 });
    prismaService.integracao.findFirst.mockResolvedValue(integracao);
    prismaService.integracao.updateMany.mockResolvedValue({ count: 1 });

    await expect(service.exclui(1, 99)).resolves.toEqual({ id: 1 });

    expect(
      integracaoSchedularService.aplicaAgendamentoPorStatus,
    ).toHaveBeenCalledWith(integracao, false);
    expect(prismaService.integracao.updateMany).toHaveBeenCalledTimes(1);
    const [args] = prismaService.integracao.updateMany.mock.calls[0] as [
      {
        where: { id: number; deletedAt: null };
        data: { deletedAt: Date };
      },
    ];
    expect(args.where).toEqual({ id: 1, deletedAt: null });
    expect(args.data.deletedAt).toBeInstanceOf(Date);
  });

  it('exclui retorna NotFoundException quando soft delete nao altera linhas', async () => {
    prismaService.integracao.findFirst.mockResolvedValue(
      buildIntegracao({ id: 1 }),
    );
    prismaService.integracao.updateMany.mockResolvedValue({ count: 0 });

    await expect(service.exclui(1, 99)).rejects.toThrow(NotFoundException);
  });

  it('atualizaStatus altera status e aplica agendamento', async () => {
    const alteraStatus: AlteraStatus = { status: true };
    prismaService.integracao.updateManyAndReturn.mockResolvedValue([
      { horaExecucao: 4 },
    ]);

    await expect(service.atualizaStatus(1, alteraStatus, 99)).resolves.toEqual({
      id: 1,
    });

    expect(prismaService.integracao.updateManyAndReturn).toHaveBeenCalledWith({
      where: { id: 1, deletedAt: null },
      data: { status: true },
      select: { horaExecucao: true },
    });
    expect(
      integracaoSchedularService.aplicaAgendamentoPorStatus,
    ).toHaveBeenCalledWith({ id: 1, horaExecucao: 4 }, true);
  });

  it('atualizaStatus retorna NotFoundException quando integracao nao existe', async () => {
    prismaService.integracao.updateManyAndReturn.mockResolvedValue([]);

    await expect(
      service.atualizaStatus(1, { status: true }, 99),
    ).rejects.toThrow(NotFoundException);
  });

  it('ativa dispara execucao assincrona com status true', async () => {
    const integracao = buildIntegracao({ id: 1, status: false });
    prismaService.integracao.findFirst.mockResolvedValue(integracao);
    integracaoExecucaoService.ativa.mockResolvedValue(undefined);

    await expect(service.ativa(1, 99)).resolves.toBeUndefined();

    expect(integracaoExecucaoService.ativa).toHaveBeenCalledWith(
      { ...integracao, status: true },
      99,
    );
  });

  it('ativa retorna NotFoundException quando integracao nao existe', async () => {
    prismaService.integracao.findFirst.mockResolvedValue(null);

    await expect(service.ativa(1, 99)).rejects.toThrow(NotFoundException);
  });

  it('executa executa integracao ativa e marca job completo', async () => {
    const integracao = buildIntegracao({ id: 1, status: true });
    prismaService.integracao.findFirst.mockResolvedValue(integracao);
    integracaoExecucaoService.executa.mockResolvedValue({
      sucesso: true,
      statusCode: 200,
      message: 'ok',
      dados: undefined,
    });

    await expect(service.executa(1, 20)).resolves.toBeUndefined();

    expect(integracaoExecucaoService.executa).toHaveBeenCalledWith(integracao);
    expect(integracaoSchedularService.atualizaStatus).toHaveBeenCalledWith(
      20,
      STATUS_JOB.COMPLETO,
    );
  });

  it('executa recusa integracao inativa', async () => {
    prismaService.integracao.findFirst.mockResolvedValue(
      buildIntegracao({ id: 1, status: false }),
    );

    await expect(service.executa(1, 20)).rejects.toThrow(BadRequestException);

    expect(integracaoExecucaoService.executa).not.toHaveBeenCalled();
  });

  it('executa marca job como erro quando execucao falha', async () => {
    const error = new Error('falha execucao');
    prismaService.integracao.findFirst.mockResolvedValue(
      buildIntegracao({ id: 1, status: true }),
    );
    integracaoExecucaoService.executa.mockRejectedValue(error);

    await expect(service.executa(1, 20)).rejects.toThrow(error);

    expect(integracaoSchedularService.atualizaStatus).toHaveBeenCalledWith(
      20,
      STATUS_JOB.ERRO,
    );
  });
});

function buildIntegracao(overrides: Partial<Integracao>): Integracao {
  return {
    id: 1,
    nome: 'Scrapping clientes',
    status: true,
    limitDeRequisicaoPorMin: 10,
    horaExecucao: 4,
    urlAuth: null,
    metodoAuth: null,
    headersAuth: [],
    bodyAuth: null,
    responseAuth: [],
    variaveisAuth: [],
    urlRefresh: null,
    metodoRefresh: null,
    headersRefresh: [],
    bodyRefresh: null,
    responseRefresh: [],
    variaveisRefresh: [],
    urlScrap: 'https://api.example.com/clientes',
    metodoScrap: METODO.GET,
    headersScrap: [],
    bodyScrap: null,
    responseScrap: [
      {
        nome: 'email',
        path: '[n].email',
        tipo: TipoCampo.EMAIL,
        identificador: true,
      },
    ],
    variaveisScrap: [],
    usuarioId: 99,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    deletedAt: null,
    ...overrides,
  } as Integracao;
}
