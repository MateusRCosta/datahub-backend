import { BadRequestException } from '@nestjs/common';
import { BaseDadosService } from 'src/base-dados/base-dados.service';
import { TipoCampo } from 'src/common/types/dados.types';
import { PrismaService } from 'src/config/prisma.service';
import { MAX_DEPTH, MAX_JOINS } from './constants';
import {
  GroupFilter,
  OPERADOR,
  OPERADOR_WHERE,
  QueryView,
  TIPO_FILTRO,
  TIPO_JOIN,
} from './types/view.types';
import { ViewQueryBuilderService } from './view-query-builder.service';

type PrismaServiceMock = {
  $queryRawUnsafe: jest.Mock;
};

type BaseDadosServiceMock = {
  retornaEstruturasPorIds: jest.Mock;
};

describe('ViewQueryBuilderService', () => {
  let service: ViewQueryBuilderService;
  let prismaService: PrismaServiceMock;
  let baseDadosService: BaseDadosServiceMock;

  const estruturaBase = [
    { cabecalho: 'email', tipo: TipoCampo.EMAIL },
    { cabecalho: 'idade', tipo: TipoCampo.NUMERO },
    { cabecalho: 'ativo', tipo: TipoCampo.BOOLEANO },
  ];

  const query: QueryView = {
    from: { baseDadosId: 10 },
    select: [
      {
        baseDadosId: 10,
        joinIndex: 0,
        campos: [{ campo: 'email', rotulo: 'Email' }],
      },
    ],
    groupFilter: [
      {
        type: TIPO_FILTRO.FILTER,
        filter: {
          joinIndex: 0,
          campo: 'idade',
          operador: OPERADOR.GREATER_EQUAL,
          valor: 18,
        },
      },
    ],
  };

  beforeEach(() => {
    prismaService = {
      $queryRawUnsafe: jest.fn(),
    };
    baseDadosService = {
      retornaEstruturasPorIds: jest.fn().mockResolvedValue([
        {
          id: 10,
          estrutura: estruturaBase,
        },
      ]),
    };
    service = new ViewQueryBuilderService(
      prismaService as unknown as PrismaService,
      baseDadosService as unknown as BaseDadosService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('build monta SQL e parametros para select e filtro', async () => {
    await expect(service.build(query)).resolves.toEqual({
      sql: 'SELECT c0."dados" ->> \'email\' AS "b0-Email" FROM "clientes" c0 WHERE c0."baseDeDadosId" = $1 AND c0."deletedAt" IS NULL AND (NULLIF(c0."dados" ->> \'idade\', \'\')::numeric >= $2)',
      params: [10, 18],
    });

    expect(baseDadosService.retornaEstruturasPorIds).toHaveBeenCalledWith([10]);
  });

  it('execute executa SQL gerado', async () => {
    prismaService.$queryRawUnsafe.mockResolvedValue([
      { Email: 'joao@example.com' },
    ]);

    await expect(service.execute(query)).resolves.toEqual([
      { Email: 'joao@example.com' },
    ]);

    expect(prismaService.$queryRawUnsafe).toHaveBeenCalledTimes(1);
    const [sql, baseId, idade] = prismaService.$queryRawUnsafe.mock
      .calls[0] as [string, number, number];
    expect(sql).toContain('SELECT');
    expect(baseId).toBe(10);
    expect(idade).toBe(18);
  });

  it('buildPaginated monta SQL paginado e count', async () => {
    const result = await service.buildPaginated(query, 2, 5, false);

    expect(result.dataSql).toContain('WITH "view_result" AS MATERIALIZED');
    expect(result.dataSql).toContain('SELECT * FROM "view_result"');
    expect(result.dataSql).toContain('LIMIT $3 OFFSET $4');
    expect(result.dataParams).toEqual([10, 18, 5, 5]);
    expect(result.totalSql).toContain('SELECT COUNT(*)::int AS "total"');
    expect(result.totalParams).toEqual([10, 18]);
  });

  it('buildPaginated inclui _clienteId quando solicitado', async () => {
    const result = await service.buildPaginated(query, 1, 10, true);

    expect(result.dataSql).toContain('SELECT c0."id" AS "_clienteId", ');
    expect(result.dataParams).toEqual([10, 18, 10, 0]);
  });

  it('buildPorClienteIds monta filtro por ids de clientes', async () => {
    const result = await service.buildPorClienteIds(query, [10, 20]);

    expect(result.sql).toContain('SELECT c0."id" AS "_clienteId", ');
    expect(result.sql).toContain('AND c0."id" = ANY($3::int[])');
    expect(result.params).toEqual([10, 18, [10, 20]]);
  });

  it('build monta join inner', async () => {
    baseDadosService.retornaEstruturasPorIds.mockResolvedValue([
      { id: 10, estrutura: estruturaBase },
      {
        id: 20,
        estrutura: [
          { cabecalho: 'email', tipo: TipoCampo.EMAIL },
          { cabecalho: 'telefone', tipo: TipoCampo.TELEFONE },
        ],
      },
    ]);
    const queryComJoin: QueryView = {
      from: { baseDadosId: 10 },
      joins: [
        {
          baseDadosIdJoin: 20,
          campoFrom: 'email',
          campoJoin: 'email',
          tipo: TIPO_JOIN.INNER,
        },
      ],
      select: [
        {
          baseDadosId: 20,
          joinIndex: 1,
          campos: [{ campo: 'telefone', rotulo: 'Telefone' }],
        },
      ],
    };

    const result = await service.build(queryComJoin);

    expect(result.sql).toContain('INNER JOIN "clientes" c1');
    expect(result.sql).toContain(
      'AND c0."dados" ->> \'email\' = c1."dados" ->> \'email\'',
    );
    expect(result.params).toEqual([20, 10]);
  });

  it('build retorna select vazio quando nao ha campos', async () => {
    await expect(service.build({ from: { baseDadosId: 10 } })).resolves.toEqual(
      {
        sql: 'SELECT 1 AS "_vazio" FROM "clientes" c0 WHERE c0."baseDeDadosId" = $1 AND c0."deletedAt" IS NULL',
        params: [10],
      },
    );
  });

  it('build retorna BadRequestException quando base nao existe', async () => {
    baseDadosService.retornaEstruturasPorIds.mockResolvedValue([]);

    await expect(service.build(query)).rejects.toThrow(BadRequestException);
  });

  it('build retorna BadRequestException quando campo nao existe', async () => {
    await expect(
      service.build({
        from: { baseDadosId: 10 },
        select: [
          {
            baseDadosId: 10,
            joinIndex: 0,
            campos: [{ campo: 'inexistente', rotulo: 'Campo' }],
          },
        ],
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('build retorna BadRequestException quando excede limite de joins', async () => {
    await expect(
      service.build({
        from: { baseDadosId: 10 },
        joins: Array.from({ length: MAX_JOINS + 1 }, () => ({
          baseDadosIdJoin: 20,
          campoFrom: 'email',
          campoJoin: 'email',
          tipo: TIPO_JOIN.INNER,
        })),
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('build retorna BadRequestException quando filtros excedem profundidade', async () => {
    let current: GroupFilter = {
      type: TIPO_FILTRO.FILTER,
      filter: {
        joinIndex: 0,
        campo: 'email',
        operador: OPERADOR.CONTAINS,
        valor: 'joao',
      },
    };

    for (let depth = 0; depth < MAX_DEPTH + 1; depth += 1) {
      current = {
        type: TIPO_FILTRO.GROUP,
        operadorWhere: OPERADOR_WHERE.AND,
        groupFilter: [current],
      };
    }

    await expect(
      service.build({
        from: { baseDadosId: 10 },
        groupFilter: [current],
      }),
    ).rejects.toThrow(BadRequestException);
  });
});
