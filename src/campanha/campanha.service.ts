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
import { QueryView, Select } from 'src/view/types/view.types';
import {
  CAMPO_REFERENCIA_PREFIX,
  TRANSICOES_STATUS_CAMPANHA,
} from './constants';
import {
  campanhaFilterConfig,
  campanhaOrderByFields,
} from './campanha.filter-config';
import { CampanhaCreateDto } from './dto/campanha-create.dto';
import { CampanhaFindAllQueryDto } from './dto/campanha-find-all-query.dto';
import { CampanhaUpdateDto } from './dto/campanha-update.dto';
import {
  CampanhaFindAll,
  CampanhaFindById,
  CampanhaVars,
  Campo,
  STATUS_CAMPANHA,
} from './types/campanha.type';
import { ClienteCampanhaService } from './cliente-campanha.service';
import { TemplateService } from 'src/template/template.service';
import { ViewService } from 'src/view/view.service';
import { paginate } from 'src/common/utils/paginated-response';
import { BaseDadosService } from 'src/base-dados/base-dados.service';

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
    this.validaScheduledAt(dto.scheduledAt);
    this.validaCampoReferencia(dto.contatoCampo, 'contatoCampo');
    this.validaVars(dto.vars);
    if (
      dto.baseDadosId !== null &&
      dto.baseDadosId !== undefined &&
      dto.viewId !== null &&
      dto.viewId !== undefined
    ) {
      throw new BadRequestException('Informe ou uma base ou uma view');
    }

    await this.validaQuantidadeVarsTemplate(dto.templateId, dto.vars);

    await this.validaFonteECampos(
      dto.viewId,
      dto.baseDadosId,
      dto.contatoCampo,
      dto.vars,
    );

    return this.prismaService.campanha.create({
      data: {
        nome: dto.nome,
        scheduledAt: dto.scheduledAt,
        templateId: dto.templateId,
        viewId: dto.viewId,
        status: STATUS_CAMPANHA.PENDENTE,
        baseDeDadoId: dto.baseDadosId,
        contatoCampo: dto.contatoCampo,
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

    if (dto.scheduledAt !== undefined) {
      this.validaScheduledAt(dto.scheduledAt);
    }

    const templateId = dto.templateId ?? campanhaAtual.templateId;
    const viewId = dto.viewId !== undefined ? dto.viewId : campanhaAtual.viewId;
    const baseDeDadoId =
      dto.baseDadosId !== undefined
        ? dto.baseDadosId
        : campanhaAtual.baseDeDadoId;
    const contatoCampo = dto.contatoCampo ?? String(campanhaAtual.contatoCampo);
    const vars = dto.vars ?? this.toCampanhaVars(campanhaAtual.vars);

    this.validaCampoReferencia(contatoCampo, 'contatoCampo');
    this.validaVars(vars);

    if (
      baseDeDadoId !== null &&
      baseDeDadoId !== undefined &&
      viewId !== null &&
      viewId !== undefined
    ) {
      throw new BadRequestException('Informe ou uma base ou uma view');
    }

    await this.validaQuantidadeVarsTemplate(templateId, vars);

    await this.validaFonteECampos(viewId, baseDeDadoId, contatoCampo, vars);

    const result = await this.prismaService.campanha.updateMany({
      where: { id, deletedAt: null, status: STATUS_CAMPANHA.PENDENTE },
      data: {
        nome: dto.nome,
        scheduledAt: dto.scheduledAt,
        templateId: dto.templateId,
        viewId,
        baseDeDadoId,
        contatoCampo: dto.contatoCampo,
        vars:
          dto.vars !== undefined
            ? (dto.vars as unknown as Prisma.InputJsonValue)
            : undefined,
        updatedAt: new Date(),
      },
    });

    if (result.count === 0) {
      throw new NotFoundException('Campanha nao encontrada');
    }

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

    this.validaTransicaoStatus(campanha.status as STATUS_CAMPANHA, novoStatus);

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
    viewId: number | null | undefined,
    baseDeDadoId: number | null | undefined,
    contatoCampo: string,
    vars: CampanhaVars,
  ): Promise<void> {
    const referencias = [
      contatoCampo,
      ...Object.values(vars)
        .filter((value) => value.startsWith(CAMPO_REFERENCIA_PREFIX))
        .map((value) => this.getReferencia(value)),
    ];

    if (baseDeDadoId !== undefined && baseDeDadoId !== null) {
      const campos = await this.buscaCamposBase(baseDeDadoId);

      for (const referencia of referencias) {
        if (!campos.has(referencia)) {
          throw new BadRequestException(
            `Campo "${referencia}" nao existe na base de dados`,
          );
        }
      }
      return;
    }

    if (viewId !== undefined && viewId !== null) {
      const query = await this.viewService.buscaConfigPorId(viewId);
      if (!query) throw new BadRequestException('View nao encontrada');

      for (const referencia of referencias) {
        if (!this.resolveViewAlias(query as QueryView, referencia)) {
          throw new BadRequestException(
            `Campo "${referencia}" nao existe na view`,
          );
        }
      }
    }
  }

  private async buscaCamposBase(baseDeDadoId: number): Promise<Set<string>> {
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
      return new Set(estruturaTipada.map((item) => item.cabecalho));
    }

    return new Set();
  }

  private validaScheduledAt(scheduledAt: Date): void {
    if (scheduledAt.getTime() < Date.now()) {
      throw new BadRequestException(
        'scheduledAt nao pode ser anterior a data atual',
      );
    }
  }

  private validaCampoReferencia(value: string, campo: string): void {
    if (value.trim() === '') {
      throw new BadRequestException(`${campo} nao deve ser nulo`);
    }
  }

  private validaVars(vars: CampanhaVars): void {
    if (!this.isStringRecord(vars)) {
      throw new BadRequestException('vars deve conter apenas valores string');
    }

    for (const value of Object.values(vars)) {
      if (
        value.startsWith(CAMPO_REFERENCIA_PREFIX) &&
        this.getReferencia(value) === ''
      ) {
        throw new BadRequestException('Referencia de vars invalida');
      }
    }
  }

  private async validaQuantidadeVarsTemplate(
    templateId: number,
    vars: CampanhaVars,
  ): Promise<void> {
    const quantidadeVars =
      await this.templateService.retornaQtdVarsPorId(templateId);

    if (quantidadeVars === undefined) {
      throw new BadRequestException('O template informado nao foi encontrado');
    }

    if (Object.keys(vars).length > quantidadeVars) {
      throw new BadRequestException(
        'A qtd de vars e maior do que o permitido pelo template',
      );
    }
  }

  private validaTransicaoStatus(
    statusAtual: STATUS_CAMPANHA,
    novoStatus: STATUS_CAMPANHA,
  ): void {
    const permitidas = TRANSICOES_STATUS_CAMPANHA.get(statusAtual) ?? [];

    if (!permitidas.includes(novoStatus)) {
      throw new BadRequestException(
        `Transicao de status invalida: ${statusAtual} para ${novoStatus}`,
      );
    }
  }

  private resolveViewAlias(
    query: QueryView,
    referencia: string,
  ): string | null {
    for (const select of query.select ?? []) {
      const alias = this.resolveViewAliasNoSelect(select, referencia);

      if (alias) {
        return alias;
      }
    }

    return null;
  }

  private resolveViewAliasNoSelect(
    select: Select,
    referencia: string,
  ): string | null {
    const campo = select.campos.find(
      (item) => item.rotulo === referencia || item.campo === referencia,
    );

    if (!campo) {
      return null;
    }

    return `b${select.joinIndex}_${campo.rotulo}`;
  }

  private getReferencia(value: string): string {
    return value.slice(1).trim();
  }

  private toCampanhaVars(value: Prisma.JsonValue): CampanhaVars {
    if (!this.isStringRecord(value)) {
      throw new BadRequestException('vars da campanha esta invalido');
    }

    return value;
  }

  private isStringRecord(value: unknown): value is CampanhaVars {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      return false;
    }

    return Object.values(value as Record<string, unknown>).every(
      (item) => typeof item === 'string',
    );
  }
}
