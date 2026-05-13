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
import { QueryView } from './types/view.types';
import { ViewExecuteQueryDto } from './dto/view-execute-query.dto';
import { ViewFindAllDto } from './dto/view-find-all-query.dto';
import { ViewCreateDto } from './dto/view-create.dto';
import { ViewUpdateDto } from './dto/view-update.dto';
import { ViewQueryBuilderService } from './view-query-builder.service';
import { viewFilterConfig, viewOrderByFields } from './view.filter-config';

type ViewListItem = {
  id: number;
  nome: string;
  createdAt: Date;
  updatedAt: Date | null;
};

type ViewDetails = ViewListItem & {
  config: Prisma.JsonValue;
};

@Injectable()
export class ViewService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly viewQueryBuilderService: ViewQueryBuilderService,
  ) {}

  async findAll(
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
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prismaService.view.count({ where }),
    ]);

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

  async findById(id: number): Promise<ViewDetails> {
    const view = await this.prismaService.view.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        nome: true,
        descricao: true,
        config: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!view) {
      throw new NotFoundException('View nao encontrada');
    }

    return view;
  }

  async execute(
    id: number,
    query: ViewExecuteQueryDto,
  ): Promise<PaginatedResponse<Record<string, unknown>>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;
    const viewQuery = await this.findConfigById(id);
    const builtQuery = await this.viewQueryBuilderService.build(viewQuery);
    const limitParam = `$${builtQuery.params.length + 1}`;
    const offsetParam = `$${builtQuery.params.length + 2}`;
    const dataSql = `${builtQuery.sql} LIMIT ${limitParam} OFFSET ${offsetParam}`;
    const totalSql = `SELECT COUNT(*)::int AS "total" FROM (${builtQuery.sql}) AS "view_result"`;

    const [data, totalResult] = await Promise.all([
      this.prismaService.$queryRawUnsafe<Record<string, unknown>[]>(
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

  async create(dto: ViewCreateDto): Promise<{ id: number }> {
    const view = await this.prismaService.view.create({
      data: {
        nome: dto.nome,
        descricao: dto.descricao ?? undefined,
        config: dto.query as unknown as Prisma.InputJsonValue,
      },
      select: {
        id: true,
      },
    });

    return view;
  }

  async update(id: number, dto: ViewUpdateDto): Promise<{ id: number }> {
    if (
      dto.nome === undefined &&
      dto.descricao === undefined &&
      dto.query === undefined
    ) {
      throw new BadRequestException(
        'Informe ao menos um campo para atualizar: nome ou query',
      );
    }

    const result = await this.prismaService.view.updateMany({
      where: { id, deletedAt: null },
      data: {
        nome: dto.nome,
        descricao: dto.descricao,
        config:
          dto.query !== undefined
            ? (dto.query as unknown as Prisma.InputJsonValue)
            : undefined,
        updatedAt: new Date(),
      },
    });

    if (result.count === 0) {
      throw new NotFoundException('View nao encontrada');
    }

    return { id };
  }

  async delete(id: number): Promise<{ id: number }> {
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
