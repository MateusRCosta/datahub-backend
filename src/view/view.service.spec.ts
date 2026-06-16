import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ViewCreateDto } from './dto/view-create.dto';
import { ViewFindAllDto } from './dto/view-find-all-query.dto';
import { ViewUpdateDto } from './dto/view-update.dto';
import { ViewQueryBuilderService } from './view-query-builder.service';
import { ViewService } from './view.service';
import { QueryView } from './types/view.types';

type ViewDelegateMock = {
  findMany: jest.Mock;
  count: jest.Mock;
  findFirst: jest.Mock;
  create: jest.Mock;
  updateMany: jest.Mock;
};

type PrismaServiceMock = {
  view: ViewDelegateMock;
  $transaction: jest.Mock;
  $queryRawUnsafe: jest.Mock;
};

type ViewQueryBuilderServiceMock = {
  build: jest.Mock;
  buildPaginated: jest.Mock;
  buildPorClienteIds: jest.Mock;
};

describe('ViewService', () => {
  let service: ViewService;
  let prismaService: PrismaServiceMock;
  let viewQueryBuilderService: ViewQueryBuilderServiceMock;

  const queryViewFixture = {
    from: { baseDadosId: 10 },
    select: [
      {
        baseDadosId: 10,
        joinIndex: 0,
        campos: [{ campo: 'email', rotulo: 'Email' }],
      },
    ],
  };
  const queryView: QueryView = queryViewFixture;
  const queryViewDto: ViewCreateDto['config'] = queryViewFixture;

  beforeEach(() => {
    prismaService = {
      view: {
        findMany: jest.fn(),
        count: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        updateMany: jest.fn(),
      },
      $transaction: jest.fn((input: Promise<unknown>[]) => Promise.all(input)),
      $queryRawUnsafe: jest.fn(),
    };

    viewQueryBuilderService = {
      build: jest.fn().mockResolvedValue({
        sql: 'SELECT c0."dados" ->> \'email\' AS "b0-Email" FROM "clientes" c0 WHERE c0."baseDeDadosId" = $1',
        params: [10],
      }),
      buildPaginated: jest
        .fn()
        .mockImplementation(
          (
            _query: QueryView,
            page: number,
            limit: number,
            includeClienteId: boolean,
          ) => ({
            dataSql: includeClienteId
              ? 'WITH "view_result" AS MATERIALIZED (SELECT c0."id" AS "_clienteId", c0."dados" ->> \'email\' AS "b0-Email" FROM "clientes" c0 WHERE c0."baseDeDadosId" = $1) SELECT * FROM "view_result" LIMIT $2 OFFSET $3'
              : 'WITH "view_result" AS MATERIALIZED (SELECT c0."dados" ->> \'email\' AS "b0-Email" FROM "clientes" c0 WHERE c0."baseDeDadosId" = $1) SELECT * FROM "view_result" LIMIT $2 OFFSET $3',
            dataParams: [10, limit, (page - 1) * limit],
            totalSql:
              'SELECT COUNT(*)::int AS "total" FROM (SELECT c0."dados" ->> \'email\' AS "b0-Email" FROM "clientes" c0 WHERE c0."baseDeDadosId" = $1) AS "view_result"',
            totalParams: [10],
          }),
        ),
      buildPorClienteIds: jest.fn().mockResolvedValue({
        sql: 'SELECT c0."id" AS "_clienteId", c0."dados" ->> \'email\' AS "b0-Email" FROM "clientes" c0 WHERE c0."baseDeDadosId" = $1 AND c0."id" = ANY($2::int[])',
        params: [10, [10, 20]],
      }),
    };

    service = new ViewService(
      prismaService as never,
      viewQueryBuilderService as unknown as ViewQueryBuilderService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('retornaTodos lista views paginadas com select enxuto', async () => {
    const data = [{ id: 1, nome: 'View clientes', usuario: { nome: 'Admin' } }];
    const query: ViewFindAllDto = {
      page: 2,
      limit: 5,
      nome: 'View',
      orderBy: 'nome',
      order: 'asc',
    };
    prismaService.view.findMany.mockResolvedValue(data);
    prismaService.view.count.mockResolvedValue(12);

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

    const [findManyArgs] = prismaService.view.findMany.mock.calls[0] as [
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
    });
  });

  it('retornaTodosParaCampanha monta campos selecionados', async () => {
    prismaService.view.findMany.mockResolvedValue([
      {
        id: 1,
        nome: 'View clientes',
        config: queryView,
      },
    ]);
    prismaService.view.count.mockResolvedValue(1);

    await expect(service.retornaTodosParaCampanha({})).resolves.toEqual({
      data: [
        {
          id: 1,
          nome: 'View clientes',
          campos: [{ baseDadosId: 10, campo: 'email', rotulo: 'Email' }],
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

  it('retornaPorId retorna view por id', async () => {
    const view = {
      id: 1,
      nome: 'View clientes',
      descricao: 'Clientes ativos',
      config: queryView as unknown as Prisma.JsonValue,
      usuario: { nome: 'Admin' },
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    };
    prismaService.view.findFirst.mockResolvedValue(view);

    await expect(service.retornaPorId(1)).resolves.toEqual(view);

    expect(prismaService.view.findFirst).toHaveBeenCalledWith({
      where: { id: 1, deletedAt: null },
      select: {
        id: true,
        nome: true,
        descricao: true,
        config: true,
        usuario: { select: { nome: true } },
        createdAt: true,
        updatedAt: true,
      },
    });
  });

  it('retornaPorId retorna NotFoundException quando view nao existe', async () => {
    prismaService.view.findFirst.mockResolvedValue(null);

    await expect(service.retornaPorId(1)).rejects.toThrow(NotFoundException);
  });

  it('cria view', async () => {
    const dto: ViewCreateDto = {
      nome: 'View clientes',
      descricao: 'Clientes ativos',
      config: queryViewDto,
    };
    prismaService.view.create.mockResolvedValue({ id: 1 });

    await expect(service.cria(dto, 99)).resolves.toEqual({ id: 1 });

    expect(prismaService.view.create).toHaveBeenCalledWith({
      data: {
        nome: 'View clientes',
        descricao: 'Clientes ativos',
        config: queryView as unknown as Prisma.InputJsonValue,
        usuarioId: 99,
      },
      select: { id: true },
    });
  });

  it('atualiza view', async () => {
    const dto: ViewUpdateDto = {
      nome: 'View nova',
      descricao: 'Descricao nova',
      config: queryViewDto,
    };
    prismaService.view.updateMany.mockResolvedValue({ count: 1 });

    await expect(service.atualiza(1, dto)).resolves.toEqual({ id: 1 });

    expect(prismaService.view.updateMany).toHaveBeenCalledTimes(1);
    const [updateArgs] = prismaService.view.updateMany.mock.calls[0] as [
      {
        where: { id: number; deletedAt: null };
        data: {
          nome?: string;
          descricao?: string;
          config?: Prisma.InputJsonValue;
          updatedAt: Date;
        };
      },
    ];
    expect(updateArgs.where).toEqual({ id: 1, deletedAt: null });
    expect(updateArgs.data.nome).toBe('View nova');
    expect(updateArgs.data.descricao).toBe('Descricao nova');
    expect(updateArgs.data.config).toEqual(queryView);
    expect(updateArgs.data.updatedAt).toBeInstanceOf(Date);
  });

  it('atualiza retorna BadRequestException quando dto nao possui campos', async () => {
    await expect(service.atualiza(1, {})).rejects.toThrow(BadRequestException);

    expect(prismaService.view.updateMany).not.toHaveBeenCalled();
  });

  it('atualiza retorna NotFoundException quando update nao altera linhas', async () => {
    prismaService.view.updateMany.mockResolvedValue({ count: 0 });

    await expect(service.atualiza(1, { nome: 'View' })).rejects.toThrow(
      NotFoundException,
    );
  });

  it('exclui faz soft delete', async () => {
    prismaService.view.updateMany.mockResolvedValue({ count: 1 });

    await expect(service.exclui(1)).resolves.toEqual({ id: 1 });

    const [args] = prismaService.view.updateMany.mock.calls[0] as [
      {
        where: { id: number; deletedAt: null };
        data: { deletedAt: Date };
      },
    ];
    expect(args.where).toEqual({ id: 1, deletedAt: null });
    expect(args.data.deletedAt).toBeInstanceOf(Date);
  });

  it('exclui retorna NotFoundException quando nao altera linhas', async () => {
    prismaService.view.updateMany.mockResolvedValue({ count: 0 });

    await expect(service.exclui(1)).rejects.toThrow(NotFoundException);
  });

  it('executa view paginada', async () => {
    prismaService.view.findFirst.mockResolvedValue({ config: queryView });
    prismaService.$queryRawUnsafe
      .mockResolvedValueOnce([{ Email: 'joao@example.com' }])
      .mockResolvedValueOnce([{ total: 1 }]);

    await expect(service.executa(1, { page: 2, limit: 5 })).resolves.toEqual({
      data: [{ Email: 'joao@example.com' }],
      meta: {
        page: 2,
        limit: 5,
        total: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: true,
      },
    });

    expect(viewQueryBuilderService.buildPaginated).toHaveBeenCalledWith(
      queryView,
      2,
      5,
      false,
    );
    expect(prismaService.$queryRawUnsafe).toHaveBeenCalledTimes(2);
    const [dataSql, baseParam, limitParam, offsetParam] = prismaService
      .$queryRawUnsafe.mock.calls[0] as [string, number, number, number];
    expect(dataSql).toContain('WITH "view_result" AS MATERIALIZED');
    expect(dataSql).toContain('SELECT * FROM "view_result"');
    expect(dataSql).toContain('LIMIT $2 OFFSET $3');
    expect(baseParam).toBe(10);
    expect(limitParam).toBe(5);
    expect(offsetParam).toBe(5);
  });

  it('executaCsv retorna csv da view', async () => {
    prismaService.view.findFirst.mockResolvedValue({ config: queryView });
    prismaService.$queryRawUnsafe.mockResolvedValue([
      {
        'b0-Email': 'joao@example.com',
        'b0-Nome': 'Joao, Silva',
        'b0-Observacao': 'Linha 1\nLinha "2"',
        'b0-Metadata': { origem: 'site' },
      },
    ]);

    await expect(service.executaCsv(1)).resolves.toBe(
      'b0-Email,b0-Nome,b0-Observacao,b0-Metadata\njoao@example.com,"Joao, Silva","Linha 1\nLinha ""2""","{""origem"":""site""}"',
    );

    expect(viewQueryBuilderService.build).toHaveBeenCalledWith(queryView);
    expect(prismaService.$queryRawUnsafe).toHaveBeenCalledTimes(1);
    const [sql, baseParam] = prismaService.$queryRawUnsafe.mock.calls[0] as [
      string,
      number,
    ];
    expect(sql).not.toContain('LIMIT');
    expect(baseParam).toBe(10);
  });

  it('executaCsv retorna string vazia quando nao ha linhas', async () => {
    prismaService.view.findFirst.mockResolvedValue({ config: queryView });
    prismaService.$queryRawUnsafe.mockResolvedValue([]);

    await expect(service.executaCsv(1)).resolves.toBe('');
  });

  it('executeComClienteId inclui _clienteId no select', async () => {
    prismaService.view.findFirst.mockResolvedValue({ config: queryView });
    prismaService.$queryRawUnsafe
      .mockResolvedValueOnce([{ _clienteId: 10, Email: 'joao@example.com' }])
      .mockResolvedValueOnce([{ total: 1 }]);

    await expect(
      service.executeComClienteId(1, { page: 1, limit: 10 }),
    ).resolves.toEqual({
      data: [{ _clienteId: 10, Email: 'joao@example.com' }],
      meta: {
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    });

    expect(viewQueryBuilderService.buildPaginated).toHaveBeenCalledWith(
      queryView,
      1,
      10,
      true,
    );
    const [dataSql] = prismaService.$queryRawUnsafe.mock.calls[0] as [string];
    expect(dataSql).toContain('SELECT c0."id" AS "_clienteId", ');
  });

  it('executePorClienteIds retorna vazio quando nao ha ids', async () => {
    await expect(service.executePorClienteIds(1, [])).resolves.toEqual([]);

    expect(prismaService.view.findFirst).not.toHaveBeenCalled();
  });

  it('executePorClienteIds filtra por ids de clientes', async () => {
    prismaService.view.findFirst.mockResolvedValue({ config: queryView });
    prismaService.$queryRawUnsafe.mockResolvedValue([
      { _clienteId: 10, Email: 'joao@example.com' },
    ]);

    await expect(service.executePorClienteIds(1, [10, 20])).resolves.toEqual([
      { _clienteId: 10, Email: 'joao@example.com' },
    ]);

    expect(viewQueryBuilderService.buildPorClienteIds).toHaveBeenCalledWith(
      queryView,
      [10, 20],
    );
    const [sql, baseParam, clienteIds] = prismaService.$queryRawUnsafe.mock
      .calls[0] as [string, number, number[]];
    expect(sql).toContain('AND c0."id" = ANY($2::int[])');
    expect(baseParam).toBe(10);
    expect(clienteIds).toEqual([10, 20]);
  });

  it('executa retorna NotFoundException quando config nao existe', async () => {
    prismaService.view.findFirst.mockResolvedValue(null);

    await expect(service.executa(1, {})).rejects.toThrow(NotFoundException);
  });

  it('buscaConfigPorId retorna config da view', async () => {
    prismaService.view.findFirst.mockResolvedValue({ config: queryView });

    await expect(service.buscaConfigPorId(1)).resolves.toEqual(queryView);

    expect(prismaService.view.findFirst).toHaveBeenCalledWith({
      where: { id: 1, deletedAt: null },
      select: { config: true },
    });
  });
});
