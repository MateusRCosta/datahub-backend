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
import { CreateTemplateDto } from './dto/template-create.dto';
import { TemplateFindAllQueryDto } from './dto/template-find-all-query.dto';
import { UpdateTemplateDto } from './dto/template-update-dto';
import {
  templateFilterConfig,
  templateOrderByFields,
} from './template.filter-config';
import { IntegracaoCampanhaService } from 'src/integracao-campanha/integracao-campanha.service';
import { TemplateFindAll, TemplateFindOne } from './types/template.types';
import { PROVEDOR_INTEGRACAO_CAMPANHA } from 'src/integracao-campanha/types/provedor-integracao-campanha.type';

@Injectable()
export class TemplateService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly integracaoCampanhaService: IntegracaoCampanhaService,
  ) {}

  async cria(
    dto: CreateTemplateDto,
    usuarioId: number,
  ): Promise<{ id: number }> {
    await this.validaIntegracaoCampanhaEProvedor(
      dto.integracaoCampanhaId,
      dto.provedor,
    );

    const template = await this.prismaService.template.create({
      data: {
        nome: dto.nome,
        integracaoCampanhaId: dto.integracaoCampanhaId,
        config: dto.config as unknown as Prisma.InputJsonValue,
        usuarioId,
      },
      select: {
        id: true,
      },
    });

    return template;
  }

  async retornaTodos(
    query: TemplateFindAllQueryDto,
  ): Promise<PaginatedResponse<TemplateFindAll>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const where = buildPrismaWhere<Prisma.TemplateWhereInput>(
      {
        id: query.id,
        nome: query.nome,
        integracaoCampanhaId: query.integracaoCampanhaId,
      },
      templateFilterConfig,
      { deletedAt: null },
    );

    const orderBy = buildPrismaOrderBy(
      query.orderBy,
      query.order,
      templateOrderByFields,
      'createdAt',
    );

    const [data, total] = await this.prismaService.$transaction([
      this.prismaService.template.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        select: {
          id: true,
          nome: true,
          integracaoCampanha: {
            select: {
              provedor: true,
              nome: true,
              id: true,
            },
          },
          usuario: {
            select: {
              id: true,
              nome: true,
            },
          },
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prismaService.template.count({ where }),
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

  async retornaPorId(id: number): Promise<TemplateFindOne> {
    const template = await this.prismaService.template.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        nome: true,
        config: true,
        integracaoCampanha: {
          select: {
            id: true,
            provedor: true,
            nome: true,
          },
        },
        usuario: {
          select: {
            id: true,
            nome: true,
          },
        },
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!template) {
      throw new NotFoundException('Template nao encontrado');
    }

    return template;
  }

  async atualiza(id: number, dto: UpdateTemplateDto): Promise<{ id: number }> {
    if (
      dto.nome === undefined &&
      dto.provedor === undefined &&
      dto.config === undefined
    ) {
      throw new BadRequestException(
        'Informe ao menos um campo para atualizar: nome, provedor, integracaoCampanhaId ou config',
      );
    }

    if (dto.provedor !== undefined) {
      await this.validaIntegracaoCampanhaEProvedor(
        dto.integracaoCampanhaId,
        dto.provedor,
      );
    }

    const result = await this.prismaService.template.updateMany({
      where: { id, deletedAt: null },
      data: {
        nome: dto.nome,
        config:
          dto.config !== undefined
            ? (dto.config as unknown as Prisma.InputJsonValue)
            : undefined,
        updatedAt: new Date(),
      },
    });

    if (result.count === 0) {
      throw new NotFoundException('Template nao encontrado');
    }

    return { id };
  }

  async exclui(id: number): Promise<{ id: number }> {
    const result = await this.prismaService.template.updateMany({
      where: { id, deletedAt: null },
      data: {
        deletedAt: new Date(),
      },
    });

    if (result.count === 0) {
      throw new NotFoundException('Template nao encontrado');
    }

    return { id };
  }

  async existePorId(id: number): Promise<boolean> {
    const idEcontrado = await this.prismaService.template.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
      },
    });
    return idEcontrado !== null;
  }

  private async validaIntegracaoCampanhaEProvedor(
    integracaoCampanhaId: number,
    provedor: PROVEDOR_INTEGRACAO_CAMPANHA,
  ): Promise<void> {
    const provedorIntegracao =
      await this.integracaoCampanhaService.retornaProvedorPorId(
        integracaoCampanhaId,
      );

    if (
      !Object.values(PROVEDOR_INTEGRACAO_CAMPANHA).includes(provedorIntegracao)
    ) {
      throw new BadRequestException(
        'Integracao Campanha nao tem um provedor aceito',
      );
    }

    if (provedor !== provedorIntegracao) {
      throw new BadRequestException(
        'Template nao pode ter um provedor diferente da sua integracao campanha',
      );
    }
  }
}
