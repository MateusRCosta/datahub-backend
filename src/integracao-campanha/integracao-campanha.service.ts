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
import { PROVEDOR_INTEGRACAO_CAMPANHA } from './types/provedor-integracao-campanha.type';
import { AtivaExecucao } from './types/execucao.type';
import { UpchatService } from './integracao/upchat.service';
import { paginate } from 'src/common/utils/paginated-response';

@Injectable()
export class IntegracaoCampanhaService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly upchatService: UpchatService,
  ) {}

  async retornaTodos(query: IntegracaoCampanhaFindAllQueryDto) {
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
          usuario: {
            select: {
              nome: true,
            },
          },
        },
      }),
      this.prismaService.integracaoCampanha.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  async retornaTodosMinimizados(query: IntegracaoCampanhaFindAllQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const where = buildPrismaWhere<Prisma.IntegracaoCampanhaWhereInput>(
      {
        id: query.id,
        provedor: query.provedor,
        nome: query.nome,
      },
      integracaoCampanhaFilterConfig,
      { deletedAt: null, status: true },
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

    return paginate(data, total, page, limit);
  }

  async retornaPorId(id: number) {
    const integracaoCampanha =
      await this.prismaService.integracaoCampanha.findFirst({
        where: { id, deletedAt: null },
        select: {
          id: true,
          nome: true,
          status: true,
          provedor: true,
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

    if (!integracaoCampanha) {
      throw new NotFoundException('Integracao campanha nao encontrada');
    }

    return integracaoCampanha;
  }

  async cria(dto: IntegracaoCampanhaCreateDto, usuarioId: number) {
    const integracaoCampanha =
      await this.prismaService.integracaoCampanha.create({
        data: {
          nome: dto.nome,
          provedor: dto.provedor,
          config: dto.config as unknown as Prisma.InputJsonValue,
          usuarioId,
        },
        select: { id: true },
      });

    return integracaoCampanha;
  }

  async atualiza(id: number, dto: IntegracaoCampanhaUpdateDto) {
    if (
      dto.nome === undefined &&
      dto.provedor === undefined &&
      dto.config === undefined
    ) {
      throw new BadRequestException(
        'Informe ao menos um campo para atualizar: status, provedor ou config',
      );
    }
    await this.prismaService.$transaction(async (tx) => {
      const integracaoAntiga = await tx.integracaoCampanha.findFirst({
        where: {
          id: id,
          deletedAt: null,
        },
      });
      if (!integracaoAntiga) {
        throw new NotFoundException('Integracao nao localizada');
      }

      if (
        dto.provedor !== undefined &&
        (integracaoAntiga.provedor as PROVEDOR_INTEGRACAO_CAMPANHA) !==
          dto.provedor
      ) {
        throw new BadRequestException(
          'Integracao atual nao pode mudar de provedor',
        );
      }

      const resultado = await tx.integracaoCampanha.updateMany({
        where: { id, deletedAt: null },
        data: {
          nome: dto.nome,
          provedor: dto.provedor,
          config:
            dto.config !== undefined
              ? (dto.config as unknown as Prisma.InputJsonValue)
              : undefined,
          updatedAt: new Date(),
        },
      });
      if (resultado.count === 0) {
        throw new NotFoundException('Integracao campanha nao encontrada');
      }
    });
  }

  async exclui(id: number) {
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

  async atualizaStatus(id: number, status: boolean) {
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

  async retornaProvedorPorId(
    id: number,
  ): Promise<PROVEDOR_INTEGRACAO_CAMPANHA> {
    const integracaoCampanha =
      await this.prismaService.integracaoCampanha.findFirst({
        where: { id, deletedAt: null },
        select: { id: true, provedor: true },
      });

    if (!integracaoCampanha) {
      throw new NotFoundException('Integracao campanha nao encontrada');
    }

    return integracaoCampanha.provedor as PROVEDOR_INTEGRACAO_CAMPANHA;
  }

  async executa(dto: AtivaExecucao): Promise<void> {
    switch (dto.provedor) {
      case PROVEDOR_INTEGRACAO_CAMPANHA.UPCHAT:
        await this.upchatService.enviaMensagem(dto);
        return;
    }
  }
}
