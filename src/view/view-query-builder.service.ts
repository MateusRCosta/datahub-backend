import { BadRequestException, Injectable } from '@nestjs/common';
import { BaseDadosEstruturaDto } from 'src/base-dados/dto/base-dados-estrutura.dto';
import { TipoCampo } from 'src/base-dados/util/type';
import { PrismaService } from 'src/config/prisma.service';
import {
  BaseMetadata,
  BuiltQuery,
  QueryContext,
} from './types/query-builder.types';
import {
  Filter,
  GroupFilter,
  Join,
  OPERADOR,
  OPERADOR_WHERE,
  QueryView,
  Select,
  TIPO_FILTRO,
  TIPO_JOIN,
} from './types/view.types';
import { BaseDadosService } from 'src/base-dados/base-dados.service';
import { MAX_DEPTH, MAX_JOINS } from './constants';

@Injectable()
export class ViewQueryBuilderService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly baseDadosService: BaseDadosService,
  ) {}

  async build(query: QueryView): Promise<BuiltQuery> {
    this.validarLimites(query);
    const baseDadosIds = this.obterBaseDadosIds(query);
    const estruturasByBaseDadosId = await this.carregarEstruturas(baseDadosIds);
    const { aliasesByKey, joinIndexParaBaseDadosId } =
      this.construirAliases(query);

    const ctx: QueryContext = {
      aliasesByKey,
      joinIndexParaBaseDadosId,
      estruturasByBaseDadosId,
      params: [],
    };

    const sql = [
      this.construirSelect(query, ctx),
      this.construirFrom(query, ctx),
      this.construirJoins(query, ctx),
      this.construirWhere(query, ctx),
    ]
      .filter(Boolean)
      .join(' ');

    return { sql, params: ctx.params };
  }

  async execute(query: QueryView): Promise<Record<string, unknown>[]> {
    const builtQuery = await this.build(query);

    return this.prismaService.$queryRawUnsafe<Record<string, unknown>[]>(
      builtQuery.sql,
      ...builtQuery.params,
    );
  }

  // VALIDACAO

  private validarLimites(query: QueryView): void {
    if ((query.joins?.length ?? 0) > MAX_JOINS) {
      throw new BadRequestException(
        `A view permite no maximo ${MAX_JOINS} joins`,
      );
    }

    if (query.groupFilter) {
      this.validarGruposFiltro(query.groupFilter);
    }
  }

  private validarGruposFiltro(groupFilters: GroupFilter[]): void {
    for (const groupFilter of groupFilters) {
      this.validarProfundidade(groupFilter);
    }
  }

  private validarProfundidade(raiz: GroupFilter): void {
    const fila: { node: GroupFilter; depth: number }[] = [
      { node: raiz, depth: 1 },
    ];

    while (fila.length > 0) {
      const { node, depth } = fila.shift()!;

      if (depth > MAX_DEPTH) {
        throw new BadRequestException(
          `A view permite filtros com profundidade maxima de ${MAX_DEPTH}`,
        );
      }

      if (node.type !== TIPO_FILTRO.GROUP) continue;

      if (node.groupFilter.length === 0) continue;

      for (const child of node.groupFilter) {
        fila.push({ node: child, depth: depth + 1 });
      }
    }
  }

  // ALIASES

  private construirAliases(query: QueryView): {
    aliasesByKey: Map<string, string>;
    joinIndexParaBaseDadosId: Map<number, number>;
  } {
    const aliasesByKey = new Map<string, string>();
    const joinIndexParaBaseDadosId = new Map<number, number>();

    aliasesByKey.set(this.chaveAlias(query.from.baseDadosId, 0), 'c0');
    joinIndexParaBaseDadosId.set(0, query.from.baseDadosId);
    query.joins?.forEach((join, index) => {
      const joinIndex = index + 1;
      aliasesByKey.set(
        this.chaveAlias(join.baseDadosIdJoin, joinIndex),
        `c${joinIndex}`,
      );
      joinIndexParaBaseDadosId.set(joinIndex, join.baseDadosIdJoin);
    });

    return { aliasesByKey, joinIndexParaBaseDadosId };
  }

  private chaveAlias(baseDadosId: number, joinIndex: number): string {
    return `${baseDadosId}:${joinIndex}`;
  }

  private obterAlias(
    ctx: QueryContext,
    baseDadosId: number,
    joinIndex: number,
  ): string {
    const alias = ctx.aliasesByKey.get(this.chaveAlias(baseDadosId, joinIndex));

    if (!alias) {
      throw new BadRequestException(
        `Base de dados ${baseDadosId} com joinIndex ${joinIndex} nao foi declarada na view`,
      );
    }

    return alias;
  }

  private resolverBaseDadosId(ctx: QueryContext, joinIndex: number): number {
    const baseDadosId = ctx.joinIndexParaBaseDadosId.get(joinIndex);

    if (baseDadosId === undefined) {
      throw new BadRequestException(
        `joinIndex ${joinIndex} nao foi declarado na view`,
      );
    }

    return baseDadosId;
  }

  // ESTRUTURA

  private obterBaseDadosIds(query: QueryView): number[] {
    const ids = [
      query.from.baseDadosId,
      ...(query.joins?.map((join) => join.baseDadosIdJoin) ?? []),
    ];

    return [...new Set(ids)];
  }

  private async carregarEstruturas(
    baseDadosIds: number[],
  ): Promise<Map<number, Map<string, TipoCampo>>> {
    const bases =
      await this.baseDadosService.retornaEstruturasPorIds(baseDadosIds);

    if (bases.length !== baseDadosIds.length) {
      throw new BadRequestException(
        'Uma ou mais bases de dados da view nao foram encontradas',
      );
    }

    return new Map(
      bases.map((base) => [base.id, this.parseEstrutura(base as BaseMetadata)]),
    );
  }

  private parseEstrutura(base: BaseMetadata): Map<string, TipoCampo> {
    if (!Array.isArray(base.estrutura)) {
      throw new BadRequestException(
        `Estrutura da base de dados ${base.id} esta invalida`,
      );
    }

    const fields = new Map<string, TipoCampo>();

    for (const item of base.estrutura as unknown as BaseDadosEstruturaDto[]) {
      fields.set(item.cabecalho, item.tipo ?? TipoCampo.TEXTO);
    }

    return fields;
  }

  // SELECT

  private construirSelect(query: QueryView, ctx: QueryContext): string {
    const campos = query.select?.flatMap((select) =>
      this.construirCamposSelect(select, ctx),
    );

    if (!campos || campos.length === 0) {
      return 'SELECT 1 AS "_vazio"';
    }

    return `SELECT ${campos.join(', ')}`;
  }

  private construirCamposSelect(select: Select, ctx: QueryContext): string[] {
    const baseDadosId = this.resolverBaseDadosId(ctx, select.joinIndex);
    const alias = this.obterAlias(ctx, baseDadosId, select.joinIndex);

    return select.campos.map((campo) => {
      this.obterTipoCampo(ctx, baseDadosId, campo.campo);
      const field = campo.campo;
      const outputAlias = campo.rotulo;
      const uniqueOutputAlias = `b${select.joinIndex}-${outputAlias}`;

      return `${alias}."dados" ->> '${field}' AS "${uniqueOutputAlias}"`;
    });
  }

  // FROM

  private construirFrom(query: QueryView, ctx: QueryContext): string {
    const alias = this.obterAlias(ctx, query.from.baseDadosId, 0);

    return `FROM "clientes" ${alias}`;
  }

  // JOIN

  private construirJoins(query: QueryView, ctx: QueryContext): string {
    if (!query.joins || query.joins.length === 0) return '';

    return query.joins
      .map((join, index) => this.construirJoin(join, index + 1, ctx))
      .join(' ');
  }

  private construirJoin(
    join: Join,
    joinIndex: number,
    ctx: QueryContext,
  ): string {
    if (join.tipo !== TIPO_JOIN.INNER) {
      throw new BadRequestException(
        `Tipo de join nao suportado: ${String(join.tipo)}`,
      );
    }

    const fromJoinIndex = join.fromJoinIndex ?? 0;
    const fromBaseDadosId = this.resolverBaseDadosId(ctx, fromJoinIndex);
    const fromAlias = this.obterAlias(ctx, fromBaseDadosId, fromJoinIndex);
    const joinAlias = this.obterAlias(ctx, join.baseDadosIdJoin, joinIndex);
    const baseDadosParam = this.adicionarParam(ctx, join.baseDadosIdJoin);
    const campoFrom = join.campoFrom;
    const campoJoin = join.campoJoin;

    this.obterTipoCampo(ctx, fromBaseDadosId, join.campoFrom);
    this.obterTipoCampo(ctx, join.baseDadosIdJoin, join.campoJoin);

    return [
      `INNER JOIN "clientes" ${joinAlias}`,
      `ON ${joinAlias}."baseDeDadosId" = ${baseDadosParam}`,
      `AND ${joinAlias}."deletedAt" IS NULL`,
      `AND ${fromAlias}."dados" ->> '${campoFrom}' = ${joinAlias}."dados" ->> '${campoJoin}'`,
    ].join(' ');
  }

  // WHERE

  private construirWhere(query: QueryView, ctx: QueryContext): string {
    const rootAlias = this.obterAlias(ctx, query.from.baseDadosId, 0);
    const rootParam = this.adicionarParam(ctx, query.from.baseDadosId);
    const predicados = [
      `${rootAlias}."baseDeDadosId" = ${rootParam}`,
      `${rootAlias}."deletedAt" IS NULL`,
    ];

    if (query.groupFilter && query.groupFilter.length > 0) {
      predicados.push(this.construirGruposFiltroRaiz(query.groupFilter, ctx));
    }

    return `WHERE ${predicados.join(' AND ')}`;
  }

  private construirGruposFiltroRaiz(
    groupFilters: GroupFilter[],
    ctx: QueryContext,
  ): string {
    if (groupFilters.length === 0) {
      return '';
    }

    let filtros = groupFilters.map((gf) =>
      this.construirGrupoFiltro(gf, ctx, 1),
    );

    filtros = filtros.filter((filtro) => filtro !== null);
    return `(${filtros.join(' AND ')})`;
  }

  private construirGrupoFiltro(
    groupFilter: GroupFilter,
    ctx: QueryContext,
    depth: number,
  ): string | null {
    if (depth > MAX_DEPTH) {
      throw new BadRequestException(
        `A view permite filtros com profundidade maxima de ${MAX_DEPTH}`,
      );
    }

    if (groupFilter.type === TIPO_FILTRO.FILTER) {
      return this.construirFiltro(groupFilter.filter, ctx);
    }

    if (groupFilter.groupFilter.length === 0) {
      return null;
    }

    const operador = this.toSqlWhereOperador(groupFilter.operadorWhere);

    const filhos = groupFilter.groupFilter
      .map((child) => this.construirGrupoFiltro(child, ctx, depth + 1))
      .filter((child): child is string => Boolean(child));

    if (filhos.length === 0) {
      return null;
    }

    return `(${filhos.join(` ${operador} `)})`;
  }

  private construirFiltro(filter: Filter, ctx: QueryContext): string {
    const baseDadosId = this.resolverBaseDadosId(ctx, filter.joinIndex);
    const alias = this.obterAlias(ctx, baseDadosId, filter.joinIndex);
    const tipoCampo = this.obterTipoCampo(ctx, baseDadosId, filter.campo);
    const expressao = this.construirExpressaoTipada(
      alias,
      filter.campo,
      tipoCampo,
    );
    const expressaoTexto = this.construirExpressaoTexto(alias, filter.campo);

    switch (filter.operador) {
      case OPERADOR.EQUAL:
        return `${expressao} = ${this.adicionarParam(ctx, filter.valor)}`;
      case OPERADOR.DIFFERENT:
        return `${expressao} <> ${this.adicionarParam(ctx, filter.valor)}`;
      case OPERADOR.GREATER:
        return `${expressao} > ${this.adicionarParam(ctx, filter.valor)}`;
      case OPERADOR.LESS:
        return `${expressao} < ${this.adicionarParam(ctx, filter.valor)}`;
      case OPERADOR.GREATER_EQUAL:
        return `${expressao} >= ${this.adicionarParam(ctx, filter.valor)}`;
      case OPERADOR.LESS_EQUAL:
        return `${expressao} <= ${this.adicionarParam(ctx, filter.valor)}`;
      case OPERADOR.CONTAINS:
        return `${expressaoTexto} ILIKE ${this.adicionarParam(ctx, `%${filter.valor}%`)}`;
      case OPERADOR.START_WITH:
        return `${expressaoTexto} ILIKE ${this.adicionarParam(ctx, `${filter.valor}%`)}`;
      case OPERADOR.IS_NULL:
        return `${expressaoTexto} IS NULL`;
      case OPERADOR.IS_NOT_NULL:
        return `${expressaoTexto} IS NOT NULL`;
      default:
        throw new BadRequestException(
          `Operador de filtro nao suportado: ${filter.operador}`,
        );
    }
  }

  // Sql

  private construirExpressaoTipada(
    alias: string,
    nomeCampo: string,
    tipoCampo: TipoCampo,
  ): string {
    const raw = this.construirExpressaoTexto(alias, nomeCampo);

    switch (tipoCampo) {
      case TipoCampo.NUMERO:
        return `NULLIF(${raw}, '')::numeric`;
      case TipoCampo.BOOLEANO:
        return `NULLIF(${raw}, '')::boolean`;
      case TipoCampo.UTC:
        return `NULLIF(${raw}, '')::timestamptz`;
      case TipoCampo.MM_DD_YYYY:
        return `TO_TIMESTAMP(NULLIF(${raw}, ''), 'MM/DD/YYYY')`;
      case TipoCampo.DD_MM_YYYY:
        return `TO_TIMESTAMP(NULLIF(${raw}, ''), 'DD/MM/YYYY')`;
      case TipoCampo.YYYY_MM_DD:
        return `TO_TIMESTAMP(NULLIF(${raw}, ''), 'YYYY-MM-DD')`;
      case TipoCampo.TEXTO:
      case TipoCampo.EMAIL:
      case TipoCampo.TELEFONE:
        return raw;
    }
  }

  private construirExpressaoTexto(alias: string, nomeCampo: string): string {
    return `${alias}."dados" ->> '${nomeCampo}'`;
  }

  // Helpers

  private obterTipoCampo(
    ctx: QueryContext,
    baseDadosId: number,
    nomeCampo: string,
  ): TipoCampo {
    const estrutura = ctx.estruturasByBaseDadosId.get(baseDadosId);

    if (!estrutura) {
      throw new BadRequestException(
        `Base de dados ${baseDadosId} nao foi carregada`,
      );
    }

    const tipo = estrutura.get(nomeCampo);

    if (!tipo) {
      throw new BadRequestException(
        `Campo "${nomeCampo}" nao existe na base de dados ${baseDadosId}`,
      );
    }

    return tipo;
  }

  private toSqlWhereOperador(operadorWhere: OPERADOR_WHERE): string {
    switch (operadorWhere) {
      case OPERADOR_WHERE.AND:
        return 'AND';
      case OPERADOR_WHERE.OR:
        return 'OR';
    }
  }

  private adicionarParam(ctx: QueryContext, value: unknown): string {
    ctx.params.push(value);
    return `$${ctx.params.length}`;
  }
}
