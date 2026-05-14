import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { EstruturaBaseDadosDto } from 'src/base-dados/dto/bases-dados-estrutura.dto';
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
} from './campanha.constants';
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
  STATUS_CAMPANHA,
} from './types/campanha.type';
import { ClienteCampanhaService } from './cliente-campanha.service';

@Injectable()
export class CampanhaService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly clienteCampanhaService: ClienteCampanhaService,
  ) {}

  async findAll(
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
          executedAt: true,
          finishedAt: true,
          templateId: true,
          viewId: true,
          baseDeDadoId: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prismaService.campanha.count({ where }),
    ]);

    return this.paginate(data, total, page, limit);
  }

  async findById(id: number): Promise<CampanhaFindById> {
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
        templateId: true,
        viewId: true,
        baseDeDadoId: true,
        createdAt: true,
        updatedAt: true,
        template: {
          select: {
            id: true,
            nome: true,
            integracaoCampanha: {
              select: {
                id: true,
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

    return campanha;
  }

  async create(dto: CampanhaCreateDto): Promise<{ id: number }> {
    this.validaScheduledAt(dto.scheduledAt);
    this.validaCampoReferencia(dto.contatoCampo, 'contatoCampo');
    this.validaVars(dto.vars);
    this.validaFonteExclusiva(dto.viewId, dto.baseDeDadoId);
    await this.validaTemplate(dto.templateId);
    await this.validaFonteECampos(
      dto.viewId,
      dto.baseDeDadoId,
      dto.contatoCampo,
      dto.vars,
    );

    return this.prismaService.campanha.create({
      data: {
        nome: dto.nome,
        scheduledAt: dto.scheduledAt,
        templateId: dto.templateId,
        viewId: dto.viewId,
        baseDeDadoId: dto.baseDeDadoId,
        contatoCampo: dto.contatoCampo,
        vars: dto.vars as unknown as Prisma.InputJsonValue,
      },
      select: { id: true },
    });
  }

  async update(id: number, dto: CampanhaUpdateDto): Promise<{ id: number }> {
    if (
      dto.nome === undefined &&
      dto.scheduledAt === undefined &&
      dto.templateId === undefined &&
      dto.viewId === undefined &&
      dto.baseDeDadoId === undefined &&
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
      (campanhaAtual.status as STATUS_CAMPANHA) !== STATUS_CAMPANHA.NAO_ENVIADO
    ) {
      throw new BadRequestException(
        'Campanha so pode ser alterada quando estiver NAO_ENVIADO',
      );
    }

    if (dto.scheduledAt !== undefined) {
      this.validaScheduledAt(dto.scheduledAt);
    }

    const templateId = dto.templateId ?? campanhaAtual.templateId;
    const viewId = dto.viewId !== undefined ? dto.viewId : campanhaAtual.viewId;
    const baseDeDadoId =
      dto.baseDeDadoId !== undefined
        ? dto.baseDeDadoId
        : campanhaAtual.baseDeDadoId;
    const contatoCampo = dto.contatoCampo ?? String(campanhaAtual.contatoCampo);
    const vars = dto.vars ?? this.toCampanhaVars(campanhaAtual.vars);

    this.validaCampoReferencia(contatoCampo, 'contatoCampo');
    this.validaVars(vars);
    this.validaFonteExclusiva(viewId, baseDeDadoId);
    await this.validaTemplate(templateId);
    await this.validaFonteECampos(viewId, baseDeDadoId, contatoCampo, vars);

    const result = await this.prismaService.campanha.updateMany({
      where: { id, deletedAt: null, status: STATUS_CAMPANHA.NAO_ENVIADO },
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

  async delete(id: number): Promise<{ id: number }> {
    const result = await this.prismaService.campanha.updateMany({
      where: {
        id,
        deletedAt: null,
        status: STATUS_CAMPANHA.NAO_ENVIADO,
      },
      data: {
        deletedAt: new Date(),
        updatedAt: new Date(),
      },
    });

    if (result.count === 0) {
      throw new BadRequestException(
        'Campanha nao encontrada ou status diferente de NAO_ENVIADO',
      );
    }

    return { id };
  }

  async alteraStatus(
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
          novoStatus === STATUS_CAMPANHA.CANCELADO ? new Date() : undefined,
      },
    });

    if (novoStatus === STATUS_CAMPANHA.CANCELADO) {
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
      this.getReferencia(contatoCampo),
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
      const query = await this.buscaQueryView(viewId);

      for (const referencia of referencias) {
        if (!this.resolveViewAlias(query, referencia)) {
          throw new BadRequestException(
            `Campo "${referencia}" nao existe na view`,
          );
        }
      }
    }
  }

  private async buscaCamposBase(baseDeDadoId: number): Promise<Set<string>> {
    const base = await this.prismaService.baseDeDados.findFirst({
      where: { id: baseDeDadoId, deletedAt: null },
      select: { estrutura: true },
    });

    if (!base) {
      throw new NotFoundException('Base de dados nao encontrada');
    }

    return new Set(
      this.toEstrutura(base.estrutura).map((item) => item.cabecalho),
    );
  }

  private async validaTemplate(templateId: number): Promise<void> {
    const template = await this.prismaService.template.findFirst({
      where: { id: templateId, deletedAt: null },
      select: {
        id: true,
        integracaoCampanha: {
          select: {
            id: true,
            deletedAt: true,
          },
        },
      },
    });

    if (!template || template.integracaoCampanha.deletedAt !== null) {
      throw new NotFoundException('Template nao encontrado');
    }
  }

  private async buscaQueryView(viewId: number): Promise<QueryView> {
    const view = await this.prismaService.view.findFirst({
      where: { id: viewId, deletedAt: null },
      select: { config: true },
    });

    if (!view) {
      throw new NotFoundException('View nao encontrada');
    }

    return view.config as unknown as QueryView;
  }

  private validaScheduledAt(scheduledAt: Date): void {
    if (scheduledAt.getTime() < Date.now()) {
      throw new BadRequestException(
        'scheduledAt nao pode ser anterior a data atual',
      );
    }
  }

  private validaFonteExclusiva(
    viewId?: number | null,
    baseDeDadoId?: number | null,
  ): void {
    const temView = viewId !== undefined && viewId !== null;
    const temBase = baseDeDadoId !== undefined && baseDeDadoId !== null;

    if (temView === temBase) {
      throw new BadRequestException(
        'Informe exatamente uma origem: viewId ou baseDeDadoId',
      );
    }
  }

  private validaCampoReferencia(value: string, campo: string): void {
    if (
      !value.startsWith(CAMPO_REFERENCIA_PREFIX) ||
      this.getReferencia(value) === ''
    ) {
      throw new BadRequestException(`${campo} deve iniciar com #`);
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

    return `b${select.baseDadosId}_${campo.rotulo}`;
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

  private toEstrutura(value: Prisma.JsonValue): EstruturaBaseDadosDto[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value as unknown as EstruturaBaseDadosDto[];
  }

  private paginate<T>(
    data: T[],
    total: number,
    page: number,
    limit: number,
  ): PaginatedResponse<T> {
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
}
