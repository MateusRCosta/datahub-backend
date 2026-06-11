import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { BaseDadosEstruturaDto } from 'src/base-dados/dto/base-dados-estrutura.dto';
import { PaginatedResponse } from 'src/common/interfaces/paginated-response.interface';
import {
  buildPrismaOrderBy,
  buildPrismaWhere,
} from 'src/common/utils/prisma-filter-parser';
import { PrismaService } from 'src/config/prisma.service';
import { QueryView } from 'src/view/types/view.types';
import { TRANSICOES_STATUS_CAMPANHA } from './constants';
import {
  campanhaFilterConfig,
  campanhaOrderByFields,
} from './campanha.filter-config';
import { CampanhaCreateDto } from './dto/campanha-create.dto';
import { CampanhaFindAllQueryDto } from './dto/campanha-find-all-query.dto';
import {
  CampanhaFindAll,
  CampanhaFindById,
  CampanhaVars,
  STATUS_CAMPANHA,
} from './types/campanha.type';
import { ClienteCampanhaService } from './cliente-campanha.service';
import { TemplateService } from 'src/template/template.service';
import { ViewService } from 'src/view/view.service';
import { paginate } from 'src/common/utils/paginated-response';
import { BaseDadosService } from 'src/base-dados/base-dados.service';
import { Campo } from 'src/common/types/dados.types';
import { CampanhaUpdateDto } from './dto/campanha-update.dto';

@Injectable()
export class CampanhaService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly clienteCampanhaService: ClienteCampanhaService,
    private readonly templateService: TemplateService,
    private readonly viewService: ViewService,
    private readonly baseDadosService: BaseDadosService,
  ) {}

  async retornaTodos(
    query: CampanhaFindAllQueryDto,
  ): Promise<PaginatedResponse<CampanhaFindAll>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const where = buildPrismaWhere<Prisma.CampanhaWhereInput>(
      {
        id: query.id,
        nome: query.nome,
        templateId: query.templateId,
        viewId: query.viewId,
        baseDeDadoId: query.baseDeDadoId,
        usuarioId: query.usuarioId,
      },
      campanhaFilterConfig,
      { deletedAt: null },
    );

    if (query.status !== undefined) {
      where.status = query.status;
    }

    const orderBy = buildPrismaOrderBy(
      query.orderBy,
      query.order,
      campanhaOrderByFields,
      'createdAt',
    );

    const [data, total] = await this.prismaService.$transaction([
      this.prismaService.campanha.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        select: {
          id: true,
          nome: true,
          status: true,
          scheduledAt: true,
          template: {
            select: {
              nome: true,
              integracaoCampanha: {
                select: {
                  nome: true,
                  provedor: true,
                },
              },
            },
          },
          view: {
            select: {
              nome: true,
            },
          },
          baseDeDados: {
            select: {
              nome: true,
            },
          },
          usuario: {
            select: {
              nome: true,
            },
          },
        },
      }),
      this.prismaService.campanha.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  async retornaPorId(id: number): Promise<CampanhaFindById> {
    const campanha = await this.prismaService.campanha.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        nome: true,
        status: true,
        vars: true,
        contatoCampo: true,
        scheduledAt: true,
        executedAt: true,
        finishedAt: true,
        view: {
          select: { id: true, nome: true, config: true },
        },
        baseDeDados: {
          select: { id: true, nome: true, estrutura: true },
        },
        usuario: {
          select: { nome: true },
        },
        createdAt: true,
        updatedAt: true,
        template: {
          select: {
            id: true,
            nome: true,
            quantidadeVars: true,
            integracaoCampanha: {
              select: {
                nome: true,
                provedor: true,
              },
            },
          },
        },
      },
    });

    if (!campanha) {
      throw new NotFoundException('Campanha nao encontrada');
    }

    const campos = this.retornaCamposDaCampanha(campanha);

    return { ...campanha, campos };
  }

  private retornaCamposDaCampanha(
    campanha: CampanhaFindById,
  ): Campo[] | undefined {
    if (campanha.baseDeDados) {
      const estruturaDaBase = campanha.baseDeDados
        .estrutura as unknown as BaseDadosEstruturaDto[];

      if (Array.isArray(estruturaDaBase) && estruturaDaBase.length > 0) {
        const camposSelecionados = estruturaDaBase.flatMap((est) => ({
          campo: est.cabecalho,
          rotulo: est.rotulo,
        }));

        return camposSelecionados;
      }
    }

    if (campanha.view) {
      const query = campanha.view.config as QueryView;
      if (Array.isArray(query.select) && query.select.length > 0) {
        const camposSelecionados = query.select.flatMap((select) =>
          select.campos.map((campo) => ({
            baseDadoId: select.baseDadosId,
            campo: campo.campo,
            rotulo: campo.rotulo,
          })),
        );

        return camposSelecionados;
      }
    }
  }

  async cria(
    dto: CampanhaCreateDto,
    usuarioId: number,
  ): Promise<{ id: number }> {
    if (
      dto.baseDadosId !== null &&
      dto.baseDadosId !== undefined &&
      dto.viewId !== null &&
      dto.viewId !== undefined
    ) {
      throw new BadRequestException('Informe ou uma base ou uma view');
    }

    await this.validaQuantidadeVarsTemplate(dto.templateId, dto.vars);

    const contatoCampo = dto.contatoCampo;

    await this.validaFonteECampos(
      contatoCampo,
      dto.vars,
      dto.viewId,
      dto.baseDadosId,
    );

    return this.prismaService.campanha.create({
      data: {
        nome: dto.nome,
        scheduledAt: dto.scheduledAt,
        templateId: dto.templateId,
        viewId: dto.viewId,
        status: STATUS_CAMPANHA.PENDENTE,
        baseDeDadoId: dto.baseDadosId,
        contatoCampo: dto.contatoCampo as unknown as Prisma.InputJsonValue,
        vars: dto.vars as unknown as Prisma.InputJsonValue,
        usuarioId,
      },
      select: { id: true },
    });
  }

  async atualiza(id: number, dto: CampanhaUpdateDto): Promise<{ id: number }> {
    if (
      dto.nome === undefined &&
      dto.scheduledAt === undefined &&
      dto.templateId === undefined &&
      dto.viewId === undefined &&
      dto.baseDadosId === undefined &&
      dto.contatoCampo === undefined &&
      dto.vars === undefined
    ) {
      throw new BadRequestException('Informe ao menos um campo para atualizar');
    }

    const campanhaAtual = await this.prismaService.campanha.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        status: true,
        templateId: true,
        viewId: true,
        baseDeDadoId: true,
        contatoCampo: true,
        vars: true,
      },
    });

    if (!campanhaAtual) {
      throw new NotFoundException('Campanha nao encontrada');
    }

    if (
      (campanhaAtual.status as STATUS_CAMPANHA) !== STATUS_CAMPANHA.PENDENTE
    ) {
      throw new BadRequestException(
        'Campanha so pode ser alterada quando estiver PENDENTE',
      );
    }

    const templateId = dto.templateId ?? campanhaAtual.templateId;
    const viewId = dto.viewId !== undefined ? dto.viewId : campanhaAtual.viewId;
    const baseDadosId =
      dto.baseDadosId !== undefined
        ? dto.baseDadosId
        : campanhaAtual.baseDeDadoId;
    const contatoCampo =
      dto.contatoCampo ?? (campanhaAtual.contatoCampo as CampanhaVars);
    const vars = dto.vars ?? (campanhaAtual.vars as CampanhaVars[]);

    await this.validaQuantidadeVarsTemplate(templateId, vars);

    await this.validaFonteECampos(contatoCampo, vars, viewId, baseDadosId);

    const result = await this.prismaService.campanha.updateMany({
      where: { id, deletedAt: null, status: STATUS_CAMPANHA.PENDENTE },
      data: {
        nome: dto.nome,
        scheduledAt: dto.scheduledAt,
        templateId: dto.templateId,
        viewId,
        baseDadosId,
        contatoCampo: dto.contatoCampo as unknown as Prisma.InputJsonValue,
        vars:
          dto.vars !== undefined
            ? (dto.vars as unknown as Prisma.InputJsonValue)
            : undefined,
        updatedAt: new Date(),
      },
    });

    if (result.count === 0)
      throw new NotFoundException('Campanha nao encontrada');

    return { id };
  }

  async exclui(id: number): Promise<{ id: number }> {
    const result = await this.prismaService.campanha.updateMany({
      where: {
        id,
        deletedAt: null,
        status: STATUS_CAMPANHA.PENDENTE,
      },
      data: {
        deletedAt: new Date(),
        updatedAt: new Date(),
      },
    });

    if (result.count === 0) {
      throw new BadRequestException(
        'Campanha nao encontrada ou status diferente de PENDENTE',
      );
    }

    return { id };
  }

  async atualizaStatus(
    id: number,
    novoStatus: STATUS_CAMPANHA,
  ): Promise<{ id: number }> {
    const campanha = await this.prismaService.campanha.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, status: true },
    });

    if (!campanha) {
      throw new NotFoundException('Campanha nao encontrada');
    }

    const permitidas =
      TRANSICOES_STATUS_CAMPANHA.get(campanha.status as STATUS_CAMPANHA) ?? [];

    if (!permitidas.includes(novoStatus)) {
      throw new BadRequestException(
        `Transicao de status invalida: ${campanha.status} para ${novoStatus}`,
      );
    }

    await this.prismaService.campanha.update({
      where: { id },
      data: {
        status: novoStatus,
        updatedAt: new Date(),
        finishedAt:
          novoStatus === STATUS_CAMPANHA.CANCELADA ? new Date() : undefined,
      },
    });

    if (novoStatus === STATUS_CAMPANHA.CANCELADA) {
      await this.clienteCampanhaService.cancelaPendentes(id);
    }

    return { id };
  }

  private async validaFonteECampos(
    contatoCampo: CampanhaVars,
    vars: CampanhaVars[],
    viewId?: number | null,
    baseDadosId?: number | null,
  ): Promise<void> {
    const varsCompleto = [contatoCampo, ...vars];
    if (baseDadosId !== undefined && baseDadosId !== null) {
      const estrutura = await this.buscaEstrutura(baseDadosId);
      if (!estrutura || estrutura.length === 0)
        throw new BadRequestException('Base nao encontrada');

      for (const v of varsCompleto) {
        const campoExiste = estrutura.some(
          (est) => est.cabecalho === v.nomeCampo,
        );

        if (!campoExiste) {
          throw new BadRequestException(
            `Campo "${v.nomeCampo}" nao existe na base`,
          );
        }
      }
      return;
    }

    if (viewId !== undefined && viewId !== null) {
      const query = await this.viewService.buscaConfigPorId(viewId);
      if (!query) throw new BadRequestException('View nao encontrada');

      for (const VView of varsCompleto) {
        if (!this.resolveViewAlias(query, VView.nomeCampo, VView.baseDadoId)) {
          throw new BadRequestException(
            `Campo "${VView.nomeCampo}" na base #${VView.baseDadoId} nao existe na view`,
          );
        }
      }
    }
  }

  private async buscaEstrutura(
    baseDeDadoId: number,
  ): Promise<BaseDadosEstruturaDto[]> {
    const base =
      await this.baseDadosService.retornaEstruturaPorId(baseDeDadoId);

    if (!base) {
      throw new NotFoundException('Base de dados nao encontrada');
    }

    const estruturaTipada: BaseDadosEstruturaDto[] = [];
    if (Array.isArray(base.estrutura)) {
      estruturaTipada.push(
        ...(base.estrutura as unknown as BaseDadosEstruturaDto[]),
      );
    }
    return estruturaTipada;
  }

  private async validaQuantidadeVarsTemplate(
    templateId: number,
    vars: CampanhaVars[],
  ): Promise<void> {
    const quantidadeVars =
      await this.templateService.retornaQtdVarsPorId(templateId);

    if (quantidadeVars === undefined)
      throw new BadRequestException('O template informado nao foi encontrado');

    if (Object.keys(vars).length > quantidadeVars) {
      throw new BadRequestException(
        'A qtd de vars e maior do que o permitido pelo template',
      );
    }
  }

  private resolveViewAlias(
    query: QueryView,
    referencia: string,
    baseDadoId?: number,
  ): string | null {
    if (baseDadoId !== undefined) {
      const select = query.select?.find(
        (item) => item.baseDadosId === baseDadoId,
      );

      if (!select) return null;

      const campo = select.campos.find((item) => item.campo === referencia);

      if (!campo) return null;

      return `b${select.baseDadosId}-${campo.rotulo}`;
    }

    return null;
  }
}
