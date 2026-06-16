import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { IntegracaoCampanhaService } from 'src/integracao-campanha/integracao-campanha.service';
import { PROVEDOR_INTEGRACAO_CAMPANHA } from 'src/integracao-campanha/types/provedor-integracao-campanha.type';
import { CreateTemplateDto } from './dto/template-create.dto';
import { TemplateFindAllQueryDto } from './dto/template-find-all-query.dto';
import { UpdateTemplateDto } from './dto/template-update-dto';
import { TemplateService } from './template.service';
import {
  BOTAO_ENUM,
  UpchatConfigTemplate,
} from './types/template-upchat.types';

type TemplateDelegateMock = {
  create: jest.Mock;
  findMany: jest.Mock;
  count: jest.Mock;
  findFirst: jest.Mock;
  updateMany: jest.Mock;
};

type PrismaServiceMock = {
  template: TemplateDelegateMock;
  $transaction: jest.Mock;
};

type IntegracaoCampanhaServiceMock = {
  retornaProvedorPorId: jest.Mock;
};

describe('TemplateService', () => {
  let service: TemplateService;
  let prismaService: PrismaServiceMock;
  let integracaoCampanhaService: IntegracaoCampanhaServiceMock;

  const config: UpchatConfigTemplate = {
    id: 10,
    tituloTemplate: 'Boas vindas',
    mensagemTemplate: 'Ola {{nome}}',
    rodapeTemplate: 'Equipe',
    botoes: [
      {
        tipo: BOTAO_ENUM.QUICK_REPLY,
        textoBotao: 'Confirmar',
      },
    ],
  };

  const createDto: CreateTemplateDto = {
    nome: 'Template upchat',
    integracaoCampanhaId: 20,
    provedor: PROVEDOR_INTEGRACAO_CAMPANHA.UPCHAT,
    config,
    quantidadeVars: 1,
  };

  beforeEach(() => {
    prismaService = {
      template: {
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        findFirst: jest.fn(),
        updateMany: jest.fn(),
      },
      $transaction: jest.fn((input: Promise<unknown>[]) => Promise.all(input)),
    };

    integracaoCampanhaService = {
      retornaProvedorPorId: jest
        .fn()
        .mockResolvedValue(PROVEDOR_INTEGRACAO_CAMPANHA.UPCHAT),
    };

    service = new TemplateService(
      prismaService as never,
      integracaoCampanhaService as unknown as IntegracaoCampanhaService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('cria valida integracao campanha e cria template', async () => {
    prismaService.template.create.mockResolvedValue({ id: 1 });

    await expect(service.cria(createDto, 99)).resolves.toEqual({ id: 1 });

    expect(integracaoCampanhaService.retornaProvedorPorId).toHaveBeenCalledWith(
      20,
    );
    expect(prismaService.template.create).toHaveBeenCalledWith({
      data: {
        nome: 'Template upchat',
        integracaoCampanhaId: 20,
        quantidadeVars: 1,
        config: config as unknown as Prisma.InputJsonValue,
        usuarioId: 99,
      },
      select: {
        id: true,
      },
    });
  });

  it('cria retorna NotFoundException quando integracaoCampanha nao encontrada', async () => {
    integracaoCampanhaService.retornaProvedorPorId.mockResolvedValue(undefined);

    await expect(service.cria(createDto, 99)).rejects.toThrow(
      NotFoundException,
    );

    expect(prismaService.template.create).not.toHaveBeenCalled();
  });

  it('cria retorna BadRequestException quando provedor diverge da integracao campanha', async () => {
    integracaoCampanhaService.retornaProvedorPorId.mockResolvedValue(
      PROVEDOR_INTEGRACAO_CAMPANHA.EMAIL,
    );

    await expect(service.cria(createDto, 99)).rejects.toThrow(
      BadRequestException,
    );

    expect(prismaService.template.create).not.toHaveBeenCalled();
  });

  it('retornaTodos lista templates paginados com select enxuto', async () => {
    const data = [
      {
        id: 1,
        nome: 'Template upchat',
        quantidadeVars: 1,
        integracaoCampanha: {
          provedor: PROVEDOR_INTEGRACAO_CAMPANHA.UPCHAT,
          nome: 'Upchat',
        },
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-02T00:00:00.000Z'),
      },
    ];
    const query: TemplateFindAllQueryDto = {
      page: 2,
      limit: 5,
      nome: 'Template',
      provedor: PROVEDOR_INTEGRACAO_CAMPANHA.UPCHAT,
      integracaoCampanhaId: 20,
      orderBy: 'nome',
      order: 'asc',
    };
    prismaService.template.findMany.mockResolvedValue(data);
    prismaService.template.count.mockResolvedValue(12);

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

    expect(prismaService.template.findMany).toHaveBeenCalledTimes(1);
    const [findManyArgs] = prismaService.template.findMany.mock.calls[0] as [
      {
        where: Prisma.TemplateWhereInput;
        skip: number;
        take: number;
        select: Record<string, unknown>;
      },
    ];
    expect(findManyArgs.where).toMatchObject({
      deletedAt: null,
      integracaoCampanha: {
        provedor: PROVEDOR_INTEGRACAO_CAMPANHA.UPCHAT,
      },
      integracaoCampanhaId: 20,
    });
    expect(findManyArgs.skip).toBe(5);
    expect(findManyArgs.take).toBe(5);
    expect(findManyArgs.select).toEqual({
      id: true,
      nome: true,
      quantidadeVars: true,
      integracaoCampanha: {
        select: {
          provedor: true,
          nome: true,
        },
      },
      createdAt: true,
      updatedAt: true,
    });
  });

  it('retornaPorId retorna template por id', async () => {
    const template = {
      id: 1,
      nome: 'Template upchat',
      config,
      quantidadeVars: 1,
      integracaoCampanha: {
        provedor: PROVEDOR_INTEGRACAO_CAMPANHA.UPCHAT,
        nome: 'Upchat',
      },
      usuario: { nome: 'Admin' },
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    };
    prismaService.template.findFirst.mockResolvedValue(template);

    await expect(service.retornaPorId(1)).resolves.toEqual(template);

    expect(prismaService.template.findFirst).toHaveBeenCalledWith({
      where: { id: 1, deletedAt: null },
      select: {
        id: true,
        nome: true,
        config: true,
        quantidadeVars: true,
        integracaoCampanha: {
          select: {
            provedor: true,
            nome: true,
          },
        },
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

  it('retornaPorId retorna NotFoundException quando template nao existe', async () => {
    prismaService.template.findFirst.mockResolvedValue(null);

    await expect(service.retornaPorId(1)).rejects.toThrow(NotFoundException);
  });

  it('atualiza template e valida provedor quando informado', async () => {
    const updateDto: UpdateTemplateDto = {
      nome: 'Template novo',
      provedor: PROVEDOR_INTEGRACAO_CAMPANHA.UPCHAT,
      quantidadeVars: 2,
      config,
    };
    prismaService.template.findFirst.mockResolvedValue({
      integracaoCampanhaId: 20,
    });
    prismaService.template.updateMany.mockResolvedValue({ count: 1 });

    await expect(service.atualiza(1, updateDto)).resolves.toEqual({ id: 1 });

    expect(integracaoCampanhaService.retornaProvedorPorId).toHaveBeenCalledWith(
      20,
    );
    expect(prismaService.template.updateMany).toHaveBeenCalledTimes(1);
    const [updateArgs] = prismaService.template.updateMany.mock.calls[0] as [
      {
        where: { id: number; deletedAt: null };
        data: {
          nome?: string;
          config?: Prisma.InputJsonValue;
          quantidadeVars?: number;
          updatedAt: Date;
        };
      },
    ];
    expect(updateArgs.where).toEqual({ id: 1, deletedAt: null });
    expect(updateArgs.data.nome).toBe('Template novo');
    expect(updateArgs.data.config).toEqual(config);
    expect(updateArgs.data.quantidadeVars).toBe(2);
    expect(updateArgs.data.updatedAt).toBeInstanceOf(Date);
  });

  it('atualiza retorna BadRequestException quando dto nao possui campos', async () => {
    const dtoVazio = {} as UpdateTemplateDto;

    await expect(service.atualiza(1, dtoVazio)).rejects.toThrow(
      BadRequestException,
    );

    expect(prismaService.template.findFirst).not.toHaveBeenCalled();
  });

  it('atualiza retorna NotFoundException quando template nao existe', async () => {
    prismaService.template.findFirst.mockResolvedValue(null);

    await expect(
      service.atualiza(1, { quantidadeVars: 2 } as UpdateTemplateDto),
    ).rejects.toThrow(NotFoundException);

    expect(prismaService.template.updateMany).not.toHaveBeenCalled();
  });

  it('atualiza retorna NotFoundException quando update nao altera linhas', async () => {
    prismaService.template.findFirst.mockResolvedValue({
      integracaoCampanhaId: 20,
    });
    prismaService.template.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      service.atualiza(1, { quantidadeVars: 2 } as UpdateTemplateDto),
    ).rejects.toThrow(NotFoundException);
  });

  it('exclui faz soft delete', async () => {
    prismaService.template.updateMany.mockResolvedValue({ count: 1 });

    await expect(service.exclui(1)).resolves.toEqual({ id: 1 });

    expect(prismaService.template.updateMany).toHaveBeenCalledTimes(1);
    const [args] = prismaService.template.updateMany.mock.calls[0] as [
      {
        where: { id: number; deletedAt: null };
        data: { deletedAt: Date };
      },
    ];
    expect(args.where).toEqual({ id: 1, deletedAt: null });
    expect(args.data.deletedAt).toBeInstanceOf(Date);
  });

  it('exclui retorna NotFoundException quando nao altera linhas', async () => {
    prismaService.template.updateMany.mockResolvedValue({ count: 0 });

    await expect(service.exclui(1)).rejects.toThrow(NotFoundException);
  });

  it('retornaQtdVarsPorId retorna quantidade de variaveis', async () => {
    prismaService.template.findFirst.mockResolvedValue({ quantidadeVars: 3 });

    await expect(service.retornaQtdVarsPorId(1)).resolves.toBe(3);

    expect(prismaService.template.findFirst).toHaveBeenCalledWith({
      where: { id: 1, deletedAt: null },
      select: {
        quantidadeVars: true,
      },
    });
  });

  it('retornaQtdVarsPorId retorna undefined quando template nao existe', async () => {
    prismaService.template.findFirst.mockResolvedValue(null);

    await expect(service.retornaQtdVarsPorId(1)).resolves.toBeUndefined();
  });
});
