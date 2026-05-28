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
import { paginate } from 'src/common/utils/paginated-response';

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
        quantidadeVars: dto.quantidadeVars,
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
          quantidadeVars: true,
          integracaoCampanha: {
            select: {
              provedor: true,
              nome: true,
            },
          },
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prismaService.template.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  async retornaPorId(id: number): Promise<TemplateFindOne> {
    const template = await this.prismaService.template.findFirst({
      where: { id, deletedAt: null },
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

    if (!template) {
      throw new NotFoundException('Template nao encontrado');
    }

    return template;
  }

  async atualiza(id: number, dto: UpdateTemplateDto): Promise<{ id: number }> {
    if (
      dto.nome === undefined &&
      dto.provedor === undefined &&
      dto.config === undefined &&
      dto.quantidadeVars === undefined
    ) {
      throw new BadRequestException(
        'Informe ao menos um campo para atualizar: nome, provedor, integracaoCampanhaId, quantidadeVars ou config',
      );
    }
    const integracaoCampanhaIdTemplate =
      await this.prismaService.template.findFirst({
        where: { id, deletedAt: null },
        select: {
          integracaoCampanhaId: true,
        },
      });

    if (!integracaoCampanhaIdTemplate?.integracaoCampanhaId)
      throw new NotFoundException('Template nao encontrado');

    if (dto.provedor !== undefined) {
      await this.validaIntegracaoCampanhaEProvedor(
        integracaoCampanhaIdTemplate.integracaoCampanhaId,
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
        quantidadeVars: dto.quantidadeVars,
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

  async retornaQtdVarsPorId(id: number): Promise<number | undefined> {
    const qtdVars = await this.prismaService.template.findFirst({
      where: { id, deletedAt: null },
      select: {
        quantidadeVars: true,
      },
    });

    return qtdVars?.quantidadeVars;
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
