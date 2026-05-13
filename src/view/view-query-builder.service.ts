import { BadRequestException, Injectable } from '@nestjs/common';
import { EstruturaBaseDadosDto } from 'src/base-dados/dto/bases-dados-estrutura.dto';
import { TipoCampo } from 'src/base-dados/util/type';
import { PrismaService } from 'src/config/prisma.service';
import {
  BaseMetadata,
  BuiltQuery,
  QueryContext,
  RuntimeJoin,
} from './types/query-builder.types';
import {
  Filter,
  GroupFilter,
  Join,
  OPERADOR,
  OPERADOR_WHERE,
  QueryView,
  Select,
  TIPO_JOIN,
} from './types/view.types';

const MAX_JOINS = 4;
const MAX_DEPTH = 3;
const FIELD_NAME_PATTERN = /^[a-zA-Z0-9_]+$/;

@Injectable()
export class ViewQueryBuilderService {
  constructor(private readonly prismaService: PrismaService) {}

  async build(query: QueryView): Promise<BuiltQuery> {
    this.validateLimits(query);

    const baseDadosIds = this.getDeclaredBaseDadosIds(query);
    const estruturasByBaseDadosId =
      await this.loadEstruturasByBaseDadosId(baseDadosIds);
    const aliasesByBaseDadosId = this.buildAliases(query);
    const ctx: QueryContext = {
      aliasesByBaseDadosId,
      estruturasByBaseDadosId,
      params: [],
    };

    const sql = [
      this.buildSelectClause(query, ctx),
      this.buildFromClause(query, ctx),
      this.buildJoinClauses(query, ctx),
      this.buildWhereClause(query, ctx),
    ]
      .filter(Boolean)
      .join(' ');

    return {
      sql,
      params: ctx.params,
    };
  }

  async execute(query: QueryView): Promise<Record<string, unknown>[]> {
    const builtQuery = await this.build(query);

    return this.prismaService.$queryRawUnsafe<Record<string, unknown>[]>(
      builtQuery.sql,
      ...builtQuery.params,
    );
  }

  private validateLimits(query: QueryView): void {
    const joinsCount = query.joins?.length ?? 0;

    if (joinsCount > MAX_JOINS) {
      throw new BadRequestException(
        `A view permite no maximo ${MAX_JOINS} joins`,
      );
    }

    if (query.groupFilter) {
      this.validateTopLevelGroupFilters(query.groupFilter);
    }
  }

  private validateTopLevelGroupFilters(groupFilters: GroupFilter[]): void {
    // if (groupFilters.length === 0) {
    //   throw new BadRequestException('Lista de filtros nao pode ser vazia');
    // }

    for (const groupFilter of groupFilters) {
      this.validateGroupDepth(groupFilter, 1);
    }
  }

  private validateGroupDepth(groupFilter: GroupFilter, depth: number): void {
    if (depth > MAX_DEPTH) {
      throw new BadRequestException(
        `A view permite filtros com profundidade maxima de ${MAX_DEPTH}`,
      );
    }

    if (groupFilter.type !== 'group') {
      return;
    }

    if (groupFilter.groupFilter.length === 0) {
      throw new BadRequestException('Grupo de filtros nao pode ser vazio');
    }

    for (const child of groupFilter.groupFilter) {
      this.validateGroupDepth(child, depth + 1);
    }
  }

  private getDeclaredBaseDadosIds(query: QueryView): number[] {
    const ids = [
      query.from.baseDadosId,
      ...(query.joins?.map((join) => join.baseDadosIdJoin) ?? []),
    ];

    return [...new Set(ids)];
  }

  private buildAliases(query: QueryView): Map<number, string> {
    const aliasesByBaseDadosId = new Map<number, string>();
    aliasesByBaseDadosId.set(query.from.baseDadosId, 'c0');

    query.joins?.forEach((join, index) => {
      if (aliasesByBaseDadosId.has(join.baseDadosIdJoin)) {
        throw new BadRequestException(
          `Base de dados ${join.baseDadosIdJoin} foi declarada mais de uma vez`,
        );
      }

      aliasesByBaseDadosId.set(join.baseDadosIdJoin, `c${index + 1}`);
    });

    return aliasesByBaseDadosId;
  }

  private async loadEstruturasByBaseDadosId(
    baseDadosIds: number[],
  ): Promise<Map<number, Map<string, TipoCampo>>> {
    const bases = await this.prismaService.baseDeDados.findMany({
      where: {
        id: { in: baseDadosIds },
        deletedAt: null,
      },
      select: {
        id: true,
        estrutura: true,
      },
    });

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

    for (const item of base.estrutura as unknown as EstruturaBaseDadosDto[]) {
      this.assertSafeFieldName(item.cabecalho);
      fields.set(item.cabecalho, this.normalizeTipoCampo(item.tipo));
    }

    return fields;
  }

  private normalizeTipoCampo(tipo?: TipoCampo): TipoCampo {
    if (!tipo) {
      return TipoCampo.TEXTO;
    }

    return tipo;
  }

  private buildSelectClause(query: QueryView, ctx: QueryContext): string {
    const selectFields = query.select?.flatMap((select) =>
      this.buildSelectFields(select, ctx),
    );

    if (!selectFields || selectFields.length === 0) {
      return 'SELECT 1 AS "_vazio"';
    }

    return `SELECT ${selectFields.join(', ')}`;
  }

  private buildSelectFields(select: Select, ctx: QueryContext): string[] {
    const alias = this.getAlias(ctx, select.baseDadosId);

    return select.campos.map((campo) => {
      this.getFieldType(ctx, select.baseDadosId, campo.campo);
      const field = this.toJsonPath(campo.campo);
      const outputAlias = this.toOutputAlias(select.baseDadosId, campo.rotulo);

      return `${alias}."dados" ->> '${field}' AS "${outputAlias}"`;
    });
  }

  private buildFromClause(query: QueryView, ctx: QueryContext): string {
    const rootAlias = this.getAlias(ctx, query.from.baseDadosId);

    return `FROM "clientes" ${rootAlias}`;
  }

  private buildJoinClauses(query: QueryView, ctx: QueryContext): string {
    if (!query.joins || query.joins.length === 0) {
      return '';
    }

    return query.joins
      .map((join) => this.buildJoinClause(query.from.baseDadosId, join, ctx))
      .join(' ');
  }

  private buildJoinClause(
    rootBaseDadosId: number,
    join: Join,
    ctx: QueryContext,
  ): string {
    const joinTipo = join.tipo;

    if (joinTipo !== TIPO_JOIN.INNER) {
      throw new BadRequestException(
        `Tipo de join nao suportado: ${String(joinTipo)}`,
      );
    }

    const runtimeJoin = join as RuntimeJoin;
    const fromBaseDadosId = runtimeJoin.fromBaseDadosId ?? rootBaseDadosId;
    const fromAlias = this.getAlias(ctx, fromBaseDadosId);
    const joinAlias = this.getAlias(ctx, join.baseDadosIdJoin);
    const baseDadosParam = this.addParam(ctx, join.baseDadosIdJoin);
    const campoFrom = this.toJsonPath(join.campoFrom);
    const campoJoin = this.toJsonPath(join.campoJoin);

    this.getFieldType(ctx, fromBaseDadosId, join.campoFrom);
    this.getFieldType(ctx, join.baseDadosIdJoin, join.campoJoin);

    return [
      `INNER JOIN "clientes" ${joinAlias}`,
      `ON ${joinAlias}."baseDeDadosId" = ${baseDadosParam}`,
      `AND ${joinAlias}."deletedAt" IS NULL`,
      `AND ${fromAlias}."dados" ->> '${campoFrom}' = ${joinAlias}."dados" ->> '${campoJoin}'`,
    ].join(' ');
  }

  private buildWhereClause(query: QueryView, ctx: QueryContext): string {
    const rootAlias = this.getAlias(ctx, query.from.baseDadosId);
    const rootBaseDadosParam = this.addParam(ctx, query.from.baseDadosId);
    const predicates = [
      `${rootAlias}."baseDeDadosId" = ${rootBaseDadosParam}`,
      `${rootAlias}."deletedAt" IS NULL`,
    ];

    if (!query.groupFilter) {
      return `WHERE ${predicates.join(' AND ')}`;
    }

    predicates.push(this.buildTopLevelGroupFilters(query.groupFilter, ctx));

    return `WHERE ${predicates.join(' AND ')}`;
  }

  private buildTopLevelGroupFilters(
    groupFilters: GroupFilter[],
    ctx: QueryContext,
  ): string {
    if (groupFilters.length === 0) {
      throw new BadRequestException('Lista de filtros nao pode ser vazia');
    }

    const filters = groupFilters.map((groupFilter) =>
      this.buildGroupFilter(groupFilter, ctx, 1),
    );

    return `(${filters.join(' AND ')})`;
  }

  private buildGroupFilter(
    groupFilter: GroupFilter,
    ctx: QueryContext,
    depth: number,
  ): string {
    if (depth > MAX_DEPTH) {
      throw new BadRequestException(
        `A view permite filtros com profundidade maxima de ${MAX_DEPTH}`,
      );
    }

    if (groupFilter.type === 'filter') {
      return this.buildFilter(groupFilter.filter, ctx);
    }

    if (groupFilter.groupFilter.length === 0) {
      throw new BadRequestException('Grupo de filtros nao pode ser vazio');
    }

    const operator = this.toSqlWhereOperator(groupFilter.operadorWhere);
    const children = groupFilter.groupFilter.map((child) =>
      this.buildGroupFilter(child, ctx, depth + 1),
    );

    return `(${children.join(` ${operator} `)})`;
  }

  private buildFilter(filter: Filter, ctx: QueryContext): string {
    const alias = this.getAlias(ctx, filter.baseDadosId);
    const fieldType = this.getFieldType(ctx, filter.baseDadosId, filter.campo);
    const expression = this.buildTypedExpression(
      alias,
      filter.campo,
      fieldType,
    );
    const textExpression = this.buildTextExpression(alias, filter.campo);
    const operator = filter.operador;

    switch (operator) {
      case OPERADOR.EQUAL:
        return `${expression} = ${this.addParam(ctx, filter.valor)}`;
      case OPERADOR.DIFFERENT:
        return `${expression} <> ${this.addParam(ctx, filter.valor)}`;
      case OPERADOR.GREATER:
        return `${expression} > ${this.addParam(ctx, filter.valor)}`;
      case OPERADOR.LESS:
        return `${expression} < ${this.addParam(ctx, filter.valor)}`;
      case OPERADOR.GREATER_EQUAL:
        return `${expression} >= ${this.addParam(ctx, filter.valor)}`;
      case OPERADOR.LESS_EQUAL:
        return `${expression} <= ${this.addParam(ctx, filter.valor)}`;
      case OPERADOR.CONTAINS:
        return `${textExpression} ILIKE ${this.addParam(ctx, `%${filter.valor}%`)}`;
      case OPERADOR.START_WITH:
        return `${textExpression} ILIKE ${this.addParam(ctx, `${filter.valor}%`)}`;
      case OPERADOR.IS_NULL:
        return `${textExpression} IS NULL`;
      case OPERADOR.IS_NOT_NULL:
        return `${textExpression} IS NOT NULL`;
      default:
        throw new BadRequestException(
          `Operador de filtro nao suportado: ${operator}`,
        );
    }
  }

  private buildTypedExpression(
    alias: string,
    fieldName: string,
    fieldType: TipoCampo,
  ): string {
    const rawExpression = this.buildTextExpression(alias, fieldName);

    switch (fieldType) {
      case TipoCampo.NUMERO:
        return `NULLIF(${rawExpression}, '')::numeric`;
      case TipoCampo.BOOLEANO:
        return `NULLIF(${rawExpression}, '')::boolean`;
      case TipoCampo.UTC:
      case TipoCampo.MM_DD_YYYY:
      case TipoCampo.DD_MM_YYYY:
        return `NULLIF(${rawExpression}, '')::timestamptz`;
      case TipoCampo.TEXTO:
      case TipoCampo.EMAIL:
      case TipoCampo.TELEFONE:
        return rawExpression;
    }
  }

  private buildTextExpression(alias: string, fieldName: string): string {
    const field = this.toJsonPath(fieldName);

    return `${alias}."dados" ->> '${field}'`;
  }

  private getAlias(ctx: QueryContext, baseDadosId: number): string {
    const alias = ctx.aliasesByBaseDadosId.get(baseDadosId);

    if (!alias) {
      throw new BadRequestException(
        `Base de dados ${baseDadosId} nao foi declarada na view`,
      );
    }

    return alias;
  }

  private getFieldType(
    ctx: QueryContext,
    baseDadosId: number,
    fieldName: string,
  ): TipoCampo {
    this.assertSafeFieldName(fieldName);

    const estrutura = ctx.estruturasByBaseDadosId.get(baseDadosId);

    if (!estrutura) {
      throw new BadRequestException(
        `Base de dados ${baseDadosId} nao foi carregada`,
      );
    }

    const fieldType = estrutura.get(fieldName);

    if (!fieldType) {
      throw new BadRequestException(
        `Campo "${fieldName}" nao existe na base de dados ${baseDadosId}`,
      );
    }

    return fieldType;
  }

  private assertSafeFieldName(fieldName: string): void {
    if (!FIELD_NAME_PATTERN.test(fieldName)) {
      throw new BadRequestException(
        `Campo "${fieldName}" possui caracteres invalidos`,
      );
    }
  }

  private toJsonPath(fieldName: string): string {
    this.assertSafeFieldName(fieldName);
    return fieldName;
  }

  private toOutputAlias(baseDadosId: number, rotulo: string): string {
    this.assertSafeFieldName(rotulo);
    return `b${baseDadosId}_${rotulo}`;
  }

  private toSqlWhereOperator(operadorWhere: OPERADOR_WHERE): string {
    switch (operadorWhere) {
      case OPERADOR_WHERE.AND:
        return 'AND';
      case OPERADOR_WHERE.OR:
        return 'OR';
    }
  }

  private addParam(ctx: QueryContext, value: unknown): string {
    ctx.params.push(value);
    return `$${ctx.params.length}`;
  }
}
