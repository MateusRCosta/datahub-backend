import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { EstruturaBaseDadosDto } from 'src/base-dados/dto/bases-dados-estrutura.dto';
import { ClientesService } from 'src/cliente/cliente.service';
import { PrismaService } from 'src/config/prisma.service';
import { IntegracaoCampanhaService } from 'src/integracao-campanha/integracao-campanha.service';
import { PROVEDOR_INTEGRACAO_CAMPANHA } from 'src/integracao-campanha/types/provedor-integracao-campanha.type';
import {
  UpchatCliente,
  UpchatConfig,
} from 'src/integracao-campanha/types/upchat.type';
import { QueryView, Select } from 'src/view/types/view.types';
import { ViewService } from 'src/view/view.service';
import {
  CAMPO_REFERENCIA_PREFIX,
  POPULA_CLIENTES_CAMPANHA_BATCH_SIZE,
} from './campanha.constants';
import { ClienteCampanhaService } from './cliente-campanha.service';
import {
  CampanhaExecucao,
  CampanhaVars,
  SourceConfig,
  STATUS_CAMPANHA,
} from './types/campanha.type';
import {
  ClienteCampanhaPendente,
  STATUS_CLIENTE_CAMPANHA,
} from './types/cliente-campanha.type';
import { ViewRowCampanha } from './types/campanha-job.type';

@Injectable()
export class CampanhaJobService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly integracaoCampanhaService: IntegracaoCampanhaService,
    private readonly viewService: ViewService,
    private readonly clientesService: ClientesService,
    private readonly clienteCampanhaService: ClienteCampanhaService,
  ) {}

  async executaCampanha(id: number): Promise<void> {
    await this.populaClientesCampanha(id);
    await this.clienteCampanhaService.marcaEmEnvioComoErro(id);

    while (true) {
      const campanha = await this.buscaCampanhaExecucao(id);

      if (
        (campanha.status as STATUS_CAMPANHA) === STATUS_CAMPANHA.PAUSA ||
        (campanha.status as STATUS_CAMPANHA) === STATUS_CAMPANHA.CANCELADO ||
        (campanha.status as STATUS_CAMPANHA) === STATUS_CAMPANHA.ENVIADO
      ) {
        return;
      }

      const pendentes =
        await this.clienteCampanhaService.buscaClientesPendentes(id);

      if (pendentes.length === 0) {
        await this.finalizaSeNaoHouverPendentes(id);
        return;
      }

      await this.enviaBatch(campanha, pendentes);
    }
  }

  private async enviaBatch(
    campanha: CampanhaExecucao,
    pendentes: ClienteCampanhaPendente[],
  ): Promise<void> {
    const vars = this.toCampanhaVars(campanha.vars);
    const sourceConfig = await this.carregaSourceConfig(
      campanha.viewId,
      campanha.baseDeDadoId,
    );
    const viewQuery =
      sourceConfig.tipo === 'view'
        ? await this.buscaQueryView(sourceConfig.viewId)
        : null;
    const viewRows =
      sourceConfig.tipo === 'view'
        ? await this.buscaViewRowsPorClientes(
            sourceConfig.viewId,
            pendentes.map((item) => item.clienteId),
          )
        : new Map<number, ViewRowCampanha>();
    const mensagens: UpchatCliente[] = [];
    const clienteCampanhaIds: number[] = [];
    const clienteCampanhaComErro: number[] = [];

    for (const pendente of pendentes) {
      const accessor =
        sourceConfig.tipo === 'base'
          ? this.montaAccessorBase(pendente.cliente.dados)
          : this.montaAccessorView(
              this.assertViewQuery(viewQuery),
              viewRows.get(pendente.clienteId),
            );
      const telefone = this.resolveReferencia(campanha.contatoCampo, accessor);

      if (!telefone) {
        clienteCampanhaComErro.push(pendente.id);
        continue;
      }

      mensagens.push({
        telefone,
        parametros: this.resolveParametros(vars, accessor),
      });
      clienteCampanhaIds.push(pendente.id);
    }

    await this.clienteCampanhaService.atualizaStatusClientes(
      clienteCampanhaComErro,
      STATUS_CLIENTE_CAMPANHA.ERRO,
    );

    if (mensagens.length === 0) {
      return;
    }

    await this.clienteCampanhaService.atualizaStatusClientes(
      clienteCampanhaIds,
      STATUS_CLIENTE_CAMPANHA.EM_ENVIO,
    );

    try {
      await this.integracaoCampanhaService.integracaoCampanhaExecucao({
        provedor: this.getProvedorUpchat(campanha),
        config: this.getUpchatConfig(
          campanha.template.integracaoCampanha.config,
        ),
        clientes: mensagens,
        templateId: this.getTemplateProviderId(campanha.template.config),
        nomeCampanha: campanha.nome,
      });

      await this.clienteCampanhaService.atualizaStatusClientes(
        clienteCampanhaIds,
        STATUS_CLIENTE_CAMPANHA.ENVIADO,
      );
    } catch (error: unknown) {
      await this.clienteCampanhaService.atualizaStatusClientes(
        clienteCampanhaIds,
        STATUS_CLIENTE_CAMPANHA.ERRO,
      );
      throw error;
    }
  }

  private async populaClientesCampanha(campanhaId: number): Promise<void> {
    const campanha = await this.prismaService.campanha.findFirst({
      where: { id: campanhaId, deletedAt: null },
      select: {
        id: true,
        viewId: true,
        baseDeDadoId: true,
      },
    });

    if (!campanha) {
      throw new NotFoundException('Campanha nao encontrada');
    }

    if (campanha.baseDeDadoId !== null) {
      await this.populaClientesDaBase(campanha.id, campanha.baseDeDadoId);
      return;
    }

    if (campanha.viewId !== null) {
      await this.populaClientesDaView(campanha.id, campanha.viewId);
      return;
    }

    throw new BadRequestException('Campanha precisa ter view ou base de dados');
  }

  private async populaClientesDaBase(
    campanhaId: number,
    baseDeDadoId: number,
  ): Promise<void> {
    let skip = 0;

    while (true) {
      const clientes = await this.clientesService.buscaIdsPorBase(
        baseDeDadoId,
        skip,
        POPULA_CLIENTES_CAMPANHA_BATCH_SIZE,
      );

      if (clientes.length === 0) {
        return;
      }

      await this.clienteCampanhaService.criaClientesCampanha(
        campanhaId,
        clientes.map((cliente) => cliente.id),
      );
      skip += clientes.length;
    }
  }

  private async populaClientesDaView(
    campanhaId: number,
    viewId: number,
  ): Promise<void> {
    let page = 1;

    while (true) {
      const rows = await this.viewService.executeComClienteId(viewId, {
        page,
        limit: POPULA_CLIENTES_CAMPANHA_BATCH_SIZE,
      });

      if (rows.data.length === 0) {
        return;
      }

      await this.clienteCampanhaService.criaClientesCampanha(campanhaId, [
        ...new Set(rows.data.map((row) => row._clienteId)),
      ]);

      if (!rows.meta.hasNextPage) {
        return;
      }

      page += 1;
    }
  }

  private async finalizaSeNaoHouverPendentes(id: number): Promise<void> {
    const pendentes =
      await this.clienteCampanhaService.contaPendentesOuEmEnvio(id);

    if (pendentes > 0) {
      return;
    }

    await this.prismaService.campanha.updateMany({
      where: {
        id,
        deletedAt: null,
        status: STATUS_CAMPANHA.EM_ENVIO,
      },
      data: {
        status: STATUS_CAMPANHA.ENVIADO,
        finishedAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }

  private async buscaCampanhaExecucao(id: number): Promise<CampanhaExecucao> {
    const campanha = await this.prismaService.campanha.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        nome: true,
        status: true,
        vars: true,
        contatoCampo: true,
        viewId: true,
        baseDeDadoId: true,
        template: {
          select: {
            config: true,
            integracaoCampanha: {
              select: {
                provedor: true,
                config: true,
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

  private async buscaViewRowsPorClientes(
    viewId: number,
    clienteIds: number[],
  ): Promise<Map<number, ViewRowCampanha>> {
    if (clienteIds.length === 0) {
      return new Map<number, ViewRowCampanha>();
    }

    const rows = await this.viewService.executePorClienteIds(
      viewId,
      clienteIds,
    );

    return new Map(rows.map((row) => [row._clienteId, row]));
  }

  private async carregaSourceConfig(
    viewId: number | null,
    baseDeDadoId: number | null,
  ): Promise<SourceConfig> {
    if (baseDeDadoId !== null) {
      const base = await this.prismaService.baseDeDados.findFirst({
        where: { id: baseDeDadoId, deletedAt: null },
        select: { estrutura: true },
      });

      if (!base) {
        throw new NotFoundException('Base de dados nao encontrada');
      }

      return {
        tipo: 'base',
        baseDeDadoId,
        campos: new Set(
          this.toEstrutura(base.estrutura).map((item) => item.cabecalho),
        ),
      };
    }

    if (viewId !== null) {
      return {
        tipo: 'view',
        viewId,
      };
    }

    throw new BadRequestException('Campanha precisa ter view ou base de dados');
  }

  private montaAccessorBase(
    dados: Prisma.JsonValue,
  ): (referencia: string) => unknown {
    const record = this.toRecord(dados);

    return (referencia: string) => record[referencia];
  }

  private montaAccessorView(
    query: QueryView,
    row?: ViewRowCampanha,
  ): (referencia: string) => unknown {
    return (referencia: string) => {
      if (!row) {
        return undefined;
      }

      const alias = this.resolveViewAlias(query, referencia);
      return alias ? row[alias] : undefined;
    };
  }

  private assertViewQuery(query: QueryView | null): QueryView {
    if (!query) {
      throw new BadRequestException('View da campanha nao foi carregada');
    }

    return query;
  }

  private resolveParametros(
    vars: CampanhaVars,
    accessor: (referencia: string) => unknown,
  ): string[] {
    return Object.values(vars).map((value) => {
      if (value.startsWith(CAMPO_REFERENCIA_PREFIX)) {
        return this.toStringOrEmpty(accessor(this.getReferencia(value)));
      }

      return value;
    });
  }

  private resolveReferencia(
    value: string,
    accessor: (referencia: string) => unknown,
  ): string {
    return this.toStringOrEmpty(accessor(this.getReferencia(value)));
  }

  private getTemplateProviderId(config: Prisma.JsonValue): number {
    const record = this.toRecord(config);
    const id = record['id'];

    if (typeof id !== 'number') {
      throw new BadRequestException('Template nao possui id do provedor');
    }

    return id;
  }

  private getUpchatConfig(config: Prisma.JsonValue): UpchatConfig {
    const record = this.toRecord(config);
    const url = record['url'];
    const queueId = record['queueId'];
    const apiKey = record['apiKey'];

    if (
      typeof url !== 'string' ||
      typeof queueId !== 'number' ||
      typeof apiKey !== 'string'
    ) {
      throw new BadRequestException('Config da integracao Upchat invalida');
    }

    return { url, queueId, apiKey };
  }

  private getProvedorUpchat(
    campanha: CampanhaExecucao,
  ): PROVEDOR_INTEGRACAO_CAMPANHA.UPCHAT {
    if (
      (campanha.template.integracaoCampanha
        .provedor as PROVEDOR_INTEGRACAO_CAMPANHA) !==
      PROVEDOR_INTEGRACAO_CAMPANHA.UPCHAT
    ) {
      throw new BadRequestException('Provedor de campanha nao suportado');
    }

    return PROVEDOR_INTEGRACAO_CAMPANHA.UPCHAT;
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

  private toRecord(value: unknown): Record<string, unknown> {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      return {};
    }

    return value as Record<string, unknown>;
  }

  private toStringOrEmpty(value: unknown): string {
    switch (typeof value) {
      case 'string':
        return value;
      case 'number':
      case 'boolean':
      case 'bigint':
        return value.toString();
      default:
        return '';
    }
  }
}
