import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  buildPrismaOrderBy,
  buildPrismaWhere,
} from 'src/common/utils/prisma-filter-parser';
import { PrismaService } from 'src/config/prisma.service';
import { IntegracaoCampanhaCreateDto } from './dto/integracao-campanha-create.dto';
import { IntegracaoCampanhaFindAllQueryDto } from './dto/integracao-campanha-find-all-query.dto';
import { IntegracaoCampanhaUpdateDto } from './dto/integracao-campanha-update.dto';
import {
  integracaoCampanhaFilterConfig,
  integracaoCampanhaOrderByFields,
} from './integracao-campanha.filter-config';

@Injectable()
export class IntegracaoCampanhaService {
  constructor(private readonly prismaService: PrismaService) {}

  async findAll(query: IntegracaoCampanhaFindAllQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const where = buildPrismaWhere<Prisma.IntegracaoCampanhaWhereInput>(
      {
        id: query.id,
        status: query.status,
        provedor: query.provedor,
        nome: query.nome,
      },
      integracaoCampanhaFilterConfig,
      { deletedAt: null },
    );

    if (query.provedor !== undefined) {
      where.provedor = query.provedor;
    }

    const orderBy = buildPrismaOrderBy(
      query.orderBy,
      query.order,
      integracaoCampanhaOrderByFields,
      'createdAt',
    );

    const [data, total] = await this.prismaService.$transaction([
      this.prismaService.integracaoCampanha.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        select: {
          id: true,
          nome: true,
          provedor: true,
          status: true,
        },
      }),
      this.prismaService.integracaoCampanha.count({ where }),
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

  async findById(id: number) {
    const integracaoCampanha =
      await this.prismaService.integracaoCampanha.findFirst({
        where: { id, deletedAt: null },
        select: {
          id: true,
          nome: true,
          status: true,
          provedor: true,
          config: true,
          createdAt: true,
          updatedAt: true,
        },
      });

    if (!integracaoCampanha) {
      throw new NotFoundException('Integracao campanha nao encontrada');
    }

    return integracaoCampanha;
  }

  async create(dto: IntegracaoCampanhaCreateDto) {
    const integracaoCampanha =
      await this.prismaService.integracaoCampanha.create({
        data: {
          nome: dto.nome,
          status: dto.status ?? false,
          provedor: dto.provedor,
          config: dto.config as unknown as Prisma.InputJsonValue,
        },
        select: { id: true },
      });

    return integracaoCampanha;
  }

  async update(id: number, dto: IntegracaoCampanhaUpdateDto) {
    if (
      dto.nome === undefined &&
      dto.status === undefined &&
      dto.provedor === undefined &&
      dto.config === undefined
    ) {
      throw new BadRequestException(
        'Informe ao menos um campo para atualizar: status, provedor ou config',
      );
    }

    const result = await this.prismaService.integracaoCampanha.updateMany({
      where: { id, deletedAt: null },
      data: {
        nome: dto.nome,
        status: dto.status,
        provedor: dto.provedor,
        config:
          dto.config !== undefined
            ? (dto.config as unknown as Prisma.InputJsonValue)
            : undefined,
        updatedAt: new Date(),
      },
    });

    if (result.count === 0) {
      throw new NotFoundException('Integracao campanha nao encontrada');
    }

    return { id };
  }

  async delete(id: number) {
    const result = await this.prismaService.integracaoCampanha.updateMany({
      where: { id, deletedAt: null },
      data: {
        deletedAt: new Date(),
      },
    });

    if (result.count === 0) {
      throw new NotFoundException('Integracao campanha nao encontrada');
    }

    return { id };
  }

  async alteraStatus(id: number, status: boolean) {
    const result = await this.prismaService.integracaoCampanha.updateMany({
      where: { id, deletedAt: null },
      data: {
        status,
        updatedAt: new Date(),
      },
    });

    if (result.count === 0) {
      throw new NotFoundException('Integracao campanha nao encontrada');
    }

    return { id };
  }
}
