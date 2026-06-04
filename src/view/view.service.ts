import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PaginatedResponse } from 'src/common/interfaces/paginated-response.interface';
import {
  buildPrismaOrderBy,
  buildPrismaWhere,
} from 'src/common/utils/prisma-filter-parser';
import { PrismaService } from 'src/config/prisma.service';
import {
  QueryView,
  ViewDetails,
  ViewListItem,
  ViewRowWithClienteId,
} from './types/view.types';
import { ViewExecuteQueryDto } from './dto/view-execute-query.dto';
import { ViewFindAllDto } from './dto/view-find-all-query.dto';
import { ViewCreateDto } from './dto/view-create.dto';
import { ViewUpdateDto } from './dto/view-update.dto';
import { ViewQueryBuilderService } from './view-query-builder.service';
import { viewFilterConfig, viewOrderByFields } from './view.filter-config';
import { paginate } from 'src/common/utils/paginated-response';

@Injectable()
export class ViewService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly viewQueryBuilderService: ViewQueryBuilderService,
  ) {}

  async retornaTodos(
    query: ViewFindAllDto,
  ): Promise<PaginatedResponse<ViewListItem>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const where = buildPrismaWhere<Prisma.ViewWhereInput>(
      {
        id: query.id,
        nome: query.nome,
      },
      viewFilterConfig,
      { deletedAt: null },
    );

    const orderBy = buildPrismaOrderBy(
      query.orderBy,
      query.order,
      viewOrderByFields,
      'createdAt',
    );

    const [data, total] = await this.prismaService.$transaction([
      this.prismaService.view.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        select: {
          id: true,
          nome: true,
          usuario: {
            select: {
              nome: true,
            },
          },
        },
      }),
      this.prismaService.view.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  async retornaTodosParaCampanha(query: ViewFindAllDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const where = buildPrismaWhere<Prisma.ViewWhereInput>(
      {
        id: query.id,
        nome: query.nome,
      },
      viewFilterConfig,
      { deletedAt: null },
    );

    const orderBy = buildPrismaOrderBy(
      query.orderBy,
      query.order,
      viewOrderByFields,
      'createdAt',
    );

    const [data, total] = await this.prismaService.$transaction([
      this.prismaService.view.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        select: {
          id: true,
          nome: true,
          config: true,
        },
      }),
      this.prismaService.view.count({ where }),
    ]);
    const dataFinal = data.flatMap((view) => {
      const query = view.config as QueryView;
      if (Array.isArray(query.select) && query.select.length > 0) {
        const camposSelecionados = query.select.flatMap((select) =>
          select.campos.map((campo) => ({
            campo: campo.campo,
            rotulo: campo.rotulo,
          })),
        );
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { config, ...viewSemConfig } = view;
        return { ...viewSemConfig, campos: camposSelecionados };
      }
    });
    return paginate(dataFinal, total, page, limit);
  }

  async retornaPorId(id: number): Promise<ViewDetails> {
    const view = await this.prismaService.view.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        nome: true,
        descricao: true,
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

    if (!view) {
      throw new NotFoundException('View nao encontrada');
    }

    return view;
  }

  async cria(dto: ViewCreateDto, usuarioId: number): Promise<{ id: number }> {
    const view = await this.prismaService.view.create({
      data: {
        nome: dto.nome,
        descricao: dto.descricao ?? undefined,
        config: dto.config as unknown as Prisma.InputJsonValue,
        usuarioId,
      },
      select: {
        id: true,
      },
    });

    return view;
  }

  async atualiza(id: number, dto: ViewUpdateDto): Promise<{ id: number }> {
    if (
      dto.nome === undefined &&
      dto.descricao === undefined &&
      dto.config === undefined
    ) {
      throw new BadRequestException(
        'Informe ao menos um campo para atualizar: nome, descricao ou config',
      );
    }

    const result = await this.prismaService.view.updateMany({
      where: { id, deletedAt: null },
      data: {
        nome: dto.nome,
        descricao: dto.descricao,
        config:
          dto.config !== undefined
            ? (dto.config as unknown as Prisma.InputJsonValue)
            : undefined,
        updatedAt: new Date(),
      },
    });

    if (result.count === 0) {
      throw new NotFoundException('View nao encontrada');
    }

    return { id };
  }

  async exclui(id: number): Promise<{ id: number }> {
    const result = await this.prismaService.view.updateMany({
      where: { id, deletedAt: null },
      data: {
        deletedAt: new Date(),
      },
    });

    if (result.count === 0) {
      throw new NotFoundException('View nao encontrada');
    }

    return { id };
  }

  async executa(
    id: number,
    query: ViewExecuteQueryDto,
  ): Promise<PaginatedResponse<Record<string, unknown>>> {
    return this.executePaginated(id, query, false);
  }

  async executeComClienteId(
    id: number,
    query: ViewExecuteQueryDto,
  ): Promise<PaginatedResponse<ViewRowWithClienteId>> {
    return this.executePaginated(id, query, true);
  }

  async executePorClienteIds(
    id: number,
    clienteIds: number[],
  ): Promise<ViewRowWithClienteId[]> {
    if (clienteIds.length === 0) {
      return [];
    }

    const viewQuery = await this.findConfigById(id);
    const builtQuery = await this.buildQuery(viewQuery, true);
    const clienteIdsParam = `$${builtQuery.params.length + 1}`;

    return this.prismaService.$queryRawUnsafe<ViewRowWithClienteId[]>(
      `${builtQuery.sql} AND c0."id" = ANY(${clienteIdsParam}::int[])`,
      ...builtQuery.params,
      clienteIds,
    );
  }

  async buscaConfigPorId(id: number): Promise<unknown> {
    const view = await this.prismaService.view.findFirst({
      where: { id: id, deletedAt: null },
      select: { config: true },
    });

    return view?.config;
  }
  private async executePaginated<T extends Record<string, unknown>>(
    id: number,
    query: ViewExecuteQueryDto,
    includeClienteId: boolean,
  ): Promise<PaginatedResponse<T>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;
    const viewQuery = await this.findConfigById(id);
    const builtQuery = await this.buildQuery(viewQuery, includeClienteId);
    const limitParam = `$${builtQuery.params.length + 1}`;
    const offsetParam = `$${builtQuery.params.length + 2}`;
    const dataSql = `${builtQuery.sql} LIMIT ${limitParam} OFFSET ${offsetParam}`;
    const totalSql = `SELECT COUNT(*)::int AS "total" FROM (${builtQuery.sql}) AS "view_result"`;

    const [data, totalResult] = await Promise.all([
      this.prismaService.$queryRawUnsafe<T[]>(
        dataSql,
        ...builtQuery.params,
        limit,
        skip,
      ),
      this.prismaService.$queryRawUnsafe<Array<{ total: number }>>(
        totalSql,
        ...builtQuery.params,
      ),
    ]);
    const total = totalResult[0]?.total ?? 0;

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPreviousPage: page > 1,
      },
    };
  }

  private async buildQuery(
    query: QueryView,
    includeClienteId: boolean,
  ): Promise<{ readonly sql: string; readonly params: readonly unknown[] }> {
    const builtQuery = await this.viewQueryBuilderService.build(query);

    if (!includeClienteId) {
      return builtQuery;
    }

    return {
      sql: builtQuery.sql.replace(
        /^SELECT\s/i,
        'SELECT c0."id" AS "_clienteId", ',
      ),
      params: builtQuery.params,
    };
  }

  private async findConfigById(id: number): Promise<QueryView> {
    const view = await this.prismaService.view.findFirst({
      where: { id, deletedAt: null },
      select: {
        config: true,
      },
    });

    if (!view) {
      throw new NotFoundException('View nao encontrada');
    }

    return view.config as unknown as QueryView;
  }
}
