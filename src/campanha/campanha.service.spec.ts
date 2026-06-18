import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { TipoCampo } from 'src/common/types/dados.types';
import { BaseDadosService } from 'src/base-dados/base-dados.service';
import { PrismaService } from 'src/config/prisma.service';
import { TemplateService } from 'src/template/template.service';
import { QueryView } from 'src/view/types/view.types';
import { ViewService } from 'src/view/view.service';
import { CampanhaCreateDto } from './dto/campanha-create.dto';
import { CampanhaUpdateDto } from './dto/campanha-update.dto';
import { CampanhaService } from './campanha.service';
import { ClienteCampanhaService } from './cliente-campanha.service';
import { STATUS_CAMPANHA } from './types/campanha.type';

type CampanhaDelegateMock = {
  findMany: jest.Mock;
  count: jest.Mock;
  findFirst: jest.Mock;
  create: jest.Mock;
  updateMany: jest.Mock;
  update: jest.Mock;
};

type PrismaServiceMock = {
  campanha: CampanhaDelegateMock;
  $transaction: jest.Mock;
};

type ClienteCampanhaServiceMock = {
  cancelaPendentes: jest.Mock;
};

type TemplateServiceMock = {
  retornaQtdVarsPorId: jest.Mock;
};

type ViewServiceMock = {
  buscaConfigPorId: jest.Mock;
};

type BaseDadosServiceMock = {
  retornaEstruturaPorId: jest.Mock;
};

describe('CampanhaService', () => {
  let service: CampanhaService;
  let prismaService: PrismaServiceMock;
  let clienteCampanhaService: ClienteCampanhaServiceMock;
  let templateService: TemplateServiceMock;
  let viewService: ViewServiceMock;
  let baseDadosService: BaseDadosServiceMock;

  const estrutura = [
    {
      cabecalho: 'telefone',
      rotulo: 'Telefone',
      tipo: TipoCampo.TEXTO,
      obrigatorio: true,
    },
    {
      cabecalho: 'nome',
      rotulo: 'Nome',
      tipo: TipoCampo.TEXTO,
      obrigatorio: true,
    },
  ];

  const queryView: QueryView = {
    from: { baseDadosId: 10 },
    select: [
      {
        baseDadosId: 10,
        joinIndex: 0,
        campos: [
          { campo: 'telefone', rotulo: 'Telefone' },
          { campo: 'nome', rotulo: 'Nome' },
        ],
      },
    ],
  };

  const createDto: CampanhaCreateDto = {
    nome: 'Campanha clientes',
    scheduledAt: new Date('2099-01-01T00:00:00.000Z'),
    templateId: 1,
    baseDadosId: 10,
    contatoCampo: { valor: 'telefone' },
    vars: [{ variavel: 'nomeCliente', valor: '#nome' }],
  };

  beforeEach(() => {
    prismaService = {
      campanha: {
        findMany: jest.fn(),
        count: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        updateMany: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn((input: Promise<unknown>[]) => Promise.all(input)),
    };
    clienteCampanhaService = {
      cancelaPendentes: jest.fn(),
    };
    templateService = {
      retornaQtdVarsPorId: jest.fn().mockResolvedValue(1),
    };
    viewService = {
      buscaConfigPorId: jest.fn().mockResolvedValue(queryView),
    };
    baseDadosService = {
      retornaEstruturaPorId: jest.fn().mockResolvedValue({ estrutura }),
    };

    service = new CampanhaService(
      prismaService as unknown as PrismaService,
      clienteCampanhaService as unknown as ClienteCampanhaService,
      templateService as unknown as TemplateService,
      viewService as unknown as ViewService,
      baseDadosService as unknown as BaseDadosService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('retornaTodos lista campanhas paginadas com filtros', async () => {
    const data = [
      {
        id: 1,
        nome: 'Campanha clientes',
        status: STATUS_CAMPANHA.PENDENTE,
        scheduledAt: new Date('2099-01-01T00:00:00.000Z'),
        template: {
          nome: 'Template',
          integracaoCampanha: { nome: 'Upchat', provedor: 'upchat' },
        },
        view: null,
        baseDeDados: { nome: 'Clientes' },
        usuario: { nome: 'Admin' },
      },
    ];
    prismaService.campanha.findMany.mockResolvedValue(data);
    prismaService.campanha.count.mockResolvedValue(12);

    await expect(
      service.retornaTodos({
        page: 2,
        limit: 5,
        nome: 'Campanha',
        status: STATUS_CAMPANHA.PENDENTE,
        templateId: 1,
        usuarioId: 99,
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

    const [findManyArgs] = prismaService.campanha.findMany.mock.calls[0] as [
      {
        skip: number;
        take: number;
        select: Record<string, unknown>;
      },
    ];
    expect(findManyArgs.skip).toBe(5);
    expect(findManyArgs.take).toBe(5);
    expect(findManyArgs.select).toHaveProperty('template');
    expect(findManyArgs.select).toHaveProperty('usuario');
  });

  it('retornaPorId retorna campos da base de dados', async () => {
    const campanha = {
      id: 1,
      nome: 'Campanha clientes',
      status: STATUS_CAMPANHA.PENDENTE,
      vars: createDto.vars as unknown as Prisma.JsonValue,
      contatoCampo: createDto.contatoCampo as unknown as Prisma.JsonValue,
      scheduledAt: createDto.scheduledAt,
      executedAt: null,
      finishedAt: null,
      view: null,
      baseDeDados: { id: 10, nome: 'Clientes', estrutura },
      usuario: { nome: 'Admin' },
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: null,
      template: {
        id: 1,
        nome: 'Template',
        quantidadeVars: 1,
        integracaoCampanha: { nome: 'Upchat', provedor: 'upchat' },
      },
    };
    prismaService.campanha.findFirst.mockResolvedValue(campanha);

    await expect(service.retornaPorId(1)).resolves.toEqual({
      ...campanha,
      campos: [
        { campo: 'telefone', rotulo: 'Telefone' },
        { campo: 'nome', rotulo: 'Nome' },
      ],
    });
  });

  it('retornaPorId retorna campos da view', async () => {
    const campanha = {
      id: 1,
      nome: 'Campanha view',
      status: STATUS_CAMPANHA.PENDENTE,
      vars: createDto.vars as unknown as Prisma.JsonValue,
      contatoCampo: createDto.contatoCampo as unknown as Prisma.JsonValue,
      scheduledAt: createDto.scheduledAt,
      executedAt: null,
      finishedAt: null,
      view: { id: 20, nome: 'View clientes', config: queryView },
      baseDeDados: null,
      usuario: { nome: 'Admin' },
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: null,
      template: {
        id: 1,
        nome: 'Template',
        quantidadeVars: 1,
        integracaoCampanha: { nome: 'Upchat', provedor: 'upchat' },
      },
    };
    prismaService.campanha.findFirst.mockResolvedValue(campanha);

    await expect(service.retornaPorId(1)).resolves.toEqual({
      ...campanha,
      campos: [
        { baseDadoId: 10, campo: 'telefone', rotulo: 'Telefone' },
        { baseDadoId: 10, campo: 'nome', rotulo: 'Nome' },
      ],
    });
  });

  it('retornaPorId retorna NotFoundException quando campanha nao existe', async () => {
    prismaService.campanha.findFirst.mockResolvedValue(null);

    await expect(service.retornaPorId(1)).rejects.toThrow(NotFoundException);
  });

  it('cria campanha com base de dados', async () => {
    prismaService.campanha.create.mockResolvedValue({ id: 1 });

    await expect(service.cria(createDto, 99)).resolves.toEqual({ id: 1 });

    const [args] = prismaService.campanha.create.mock.calls[0] as [
      {
        data: {
          nome: string;
          scheduledAt: Date;
          templateId: number;
          baseDeDadosId?: number;
          viewId?: number;
          status: STATUS_CAMPANHA;
          contatoCampo: Prisma.InputJsonValue;
          vars: Prisma.InputJsonValue;
          usuarioId: number;
        };
        select: { id: true };
      },
    ];
    expect(args.data.nome).toBe(createDto.nome);
    expect(args.data.status).toBe(STATUS_CAMPANHA.PENDENTE);
    expect(args.data.baseDeDadosId).toBe(10);
    expect(args.data.usuarioId).toBe(99);
    expect(args.select).toEqual({ id: true });
  });

  it('cria campanha com view', async () => {
    const dto: CampanhaCreateDto = {
      ...createDto,
      baseDadosId: undefined,
      viewId: 20,
      contatoCampo: { valor: 'telefone', baseDadosId: 10 },
      vars: [{ variavel: 'nomeCliente', valor: '#nome', baseDadosId: 10 }],
    };
    prismaService.campanha.create.mockResolvedValue({ id: 1 });

    await expect(service.cria(dto, 99)).resolves.toEqual({ id: 1 });

    expect(viewService.buscaConfigPorId).toHaveBeenCalledWith(20);
    expect(baseDadosService.retornaEstruturaPorId).not.toHaveBeenCalled();
  });

  it('cria retorna BadRequestException quando informa base e view', async () => {
    await expect(
      service.cria({ ...createDto, viewId: 20 }, 99),
    ).rejects.toThrow(BadRequestException);

    expect(prismaService.campanha.create).not.toHaveBeenCalled();
  });

  it('cria retorna BadRequestException quando template nao existe', async () => {
    templateService.retornaQtdVarsPorId.mockResolvedValue(undefined);

    await expect(service.cria(createDto, 99)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('cria retorna BadRequestException quando var excede quantidade do template', async () => {
    templateService.retornaQtdVarsPorId.mockResolvedValue(0);

    await expect(service.cria(createDto, 99)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('cria retorna BadRequestException quando contato nao existe na base', async () => {
    await expect(
      service.cria(
        {
          ...createDto,
          contatoCampo: { valor: 'whatsapp' },
        },
        99,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('atualiza campanha pendente', async () => {
    const dto: CampanhaUpdateDto = {
      nome: 'Campanha nova',
      scheduledAt: new Date('2099-02-01T00:00:00.000Z'),
    };
    prismaService.campanha.findFirst.mockResolvedValue({
      id: 1,
      status: STATUS_CAMPANHA.PENDENTE,
      templateId: 1,
      viewId: null,
      baseDeDadosId: 10,
      contatoCampo: createDto.contatoCampo,
      vars: createDto.vars,
    });
    prismaService.campanha.updateMany.mockResolvedValue({ count: 1 });

    await expect(service.atualiza(1, dto)).resolves.toEqual({ id: 1 });

    const [args] = prismaService.campanha.updateMany.mock.calls[0] as [
      {
        where: {
          id: number;
          deletedAt: null;
          status: STATUS_CAMPANHA;
        };
        data: {
          nome?: string;
          scheduledAt?: Date;
          updatedAt: Date;
        };
      },
    ];
    expect(args.where).toEqual({
      id: 1,
      deletedAt: null,
      status: STATUS_CAMPANHA.PENDENTE,
    });
    expect(args.data.nome).toBe('Campanha nova');
    expect(args.data.scheduledAt).toEqual(dto.scheduledAt);
    expect(args.data.updatedAt).toBeInstanceOf(Date);
  });

  it('atualiza retorna BadRequestException quando dto nao possui campos', async () => {
    await expect(service.atualiza(1, {})).rejects.toThrow(BadRequestException);

    expect(prismaService.campanha.findFirst).not.toHaveBeenCalled();
  });

  it('atualiza retorna NotFoundException quando campanha nao existe', async () => {
    prismaService.campanha.findFirst.mockResolvedValue(null);

    await expect(service.atualiza(1, { nome: 'Nova' })).rejects.toThrow(
      NotFoundException,
    );
  });

  it('atualiza retorna BadRequestException quando status nao e pendente', async () => {
    prismaService.campanha.findFirst.mockResolvedValue({
      id: 1,
      status: STATUS_CAMPANHA.EM_ENVIO,
      templateId: 1,
      viewId: null,
      baseDeDadosId: 10,
      contatoCampo: createDto.contatoCampo,
      vars: createDto.vars,
    });

    await expect(service.atualiza(1, { nome: 'Nova' })).rejects.toThrow(
      BadRequestException,
    );
  });

  it('exclui faz soft delete apenas de campanha pendente', async () => {
    prismaService.campanha.updateMany.mockResolvedValue({ count: 1 });

    await expect(service.exclui(1)).resolves.toEqual({ id: 1 });

    const [args] = prismaService.campanha.updateMany.mock.calls[0] as [
      {
        where: { id: number; deletedAt: null; status: STATUS_CAMPANHA };
        data: { deletedAt: Date; updatedAt: Date };
      },
    ];
    expect(args.where).toEqual({
      id: 1,
      deletedAt: null,
      status: STATUS_CAMPANHA.PENDENTE,
    });
    expect(args.data.deletedAt).toBeInstanceOf(Date);
    expect(args.data.updatedAt).toBeInstanceOf(Date);
  });

  it('exclui retorna BadRequestException quando nao altera linhas', async () => {
    prismaService.campanha.updateMany.mockResolvedValue({ count: 0 });

    await expect(service.exclui(1)).rejects.toThrow(BadRequestException);
  });

  it('atualizaStatus cancela campanha e cancela clientes pendentes', async () => {
    prismaService.campanha.findFirst.mockResolvedValue({
      id: 1,
      status: STATUS_CAMPANHA.EM_ENVIO,
    });
    prismaService.campanha.update.mockResolvedValue({ id: 1 });
    clienteCampanhaService.cancelaPendentes.mockResolvedValue(undefined);

    await expect(
      service.atualizaStatus(1, STATUS_CAMPANHA.CANCELADA),
    ).resolves.toEqual({ id: 1 });

    const [args] = prismaService.campanha.update.mock.calls[0] as [
      {
        where: { id: number };
        data: {
          status: STATUS_CAMPANHA;
          updatedAt: Date;
          finishedAt?: Date;
        };
      },
    ];
    expect(args.where).toEqual({ id: 1 });
    expect(args.data.status).toBe(STATUS_CAMPANHA.CANCELADA);
    expect(args.data.updatedAt).toBeInstanceOf(Date);
    expect(args.data.finishedAt).toBeInstanceOf(Date);
    expect(clienteCampanhaService.cancelaPendentes).toHaveBeenCalledWith(1);
  });

  it('atualizaStatus pausa campanha em envio', async () => {
    prismaService.campanha.findFirst.mockResolvedValue({
      id: 1,
      status: STATUS_CAMPANHA.EM_ENVIO,
    });
    prismaService.campanha.update.mockResolvedValue({ id: 1 });

    await expect(
      service.atualizaStatus(1, STATUS_CAMPANHA.PAUSA),
    ).resolves.toEqual({ id: 1 });

    expect(clienteCampanhaService.cancelaPendentes).not.toHaveBeenCalled();
  });

  it('atualizaStatus retorna NotFoundException quando campanha nao existe', async () => {
    prismaService.campanha.findFirst.mockResolvedValue(null);

    await expect(
      service.atualizaStatus(1, STATUS_CAMPANHA.CANCELADA),
    ).rejects.toThrow(NotFoundException);
  });

  it('atualizaStatus retorna BadRequestException para transicao invalida', async () => {
    prismaService.campanha.findFirst.mockResolvedValue({
      id: 1,
      status: STATUS_CAMPANHA.PENDENTE,
    });

    await expect(
      service.atualizaStatus(1, STATUS_CAMPANHA.ENVIADA),
    ).rejects.toThrow(BadRequestException);
  });
});
