import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CsvParser } from 'nest-csv-parser';
import { PrismaService } from '../config/prisma.service';
import { BasesDadosFindAllQueryDto } from './dto/bases-dados-find-all-query.dto';
import { Prisma } from '@prisma/client';
import {
  buildPrismaOrderBy,
  buildPrismaWhere,
} from '../common/utils/prisma-filter-parser';
import {
  basesDadosFilterConfig,
  basesDadosOrderByFields,
} from './base-dados.filter-config';
import { BasesDadosCreateDto } from './dto/bases-dados-create.dto';
import { BasesDadosUpdateDto } from './dto/bases-dados-update.dto';
import { Readable } from 'stream';
import { ClientesService } from 'src/cliente/cliente.service';
import { IntegracaoResponseDto } from 'src/integracao/dto/integracao-response-dto';
import { EstruturaBaseDadosDto } from './dto/bases-dados-estrutura.dto';

type ResultadoPersistenciaClientes = {
  criados: number;
  atualizados: number;
};

@Injectable()
export class BasesDadosService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly csvParser: CsvParser,
    private readonly clientesService: ClientesService,
  ) {}

  async findAll(query: BasesDadosFindAllQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const where = buildPrismaWhere<Prisma.BaseDeDadosWhereInput>(
      {
        id: query.id,
        nome: query.nome,
        usuarioId: query.usuarioId,
        integracaoId: query.integracaoId,
      },
      basesDadosFilterConfig,
      { deletedAt: null },
    );

    const orderBy = buildPrismaOrderBy(
      query.orderBy,
      query.order,
      basesDadosOrderByFields,
      'createdAt',
    );

    const [data, total] = await this.prismaService.$transaction([
      this.prismaService.baseDeDados.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        select: {
          id: true,
          nome: true,
          integracao: {
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
      this.prismaService.baseDeDados.count({ where }),
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
    const baseDeDados = await this.prismaService.baseDeDados.findUnique({
      where: { id, deletedAt: null },
      select: {
        id: true,
        nome: true,
        integracao: {
          select: {
            id: true,
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

    if (!baseDeDados) {
      throw new NotFoundException();
    }

    return baseDeDados;
  }

  async garanteBaseDaIntegracao(
    prisma: Prisma.TransactionClient,
    integracaoId: number,
    integracaoUsuarioId: number,
    integracaoNome: string,
    integracaoResponseScrap: unknown,
  ) {
    const estruturaScrap = this.montaEstruturaDaIntegracao(
      this.parseJsonField<IntegracaoResponseDto[]>(integracaoResponseScrap, []),
    );

    const baseExistente = await prisma.baseDeDados.findFirst({
      where: {
        integracaoId: integracaoId,
        deletedAt: null,
      },
      select: {
        id: true,
        estrutura: true,
      },
    });

    if (!baseExistente) {
      const baseCriada = await prisma.baseDeDados.create({
        data: {
          nome: integracaoNome,
          estrutura: estruturaScrap as unknown as Prisma.InputJsonValue,
          usuarioId: integracaoUsuarioId,
          integracaoId: integracaoId,
        },
        select: { id: true },
      });

      return baseCriada.id;
    }

    const estruturaAtual = this.toEstruturaArray(baseExistente.estrutura);
    const estruturaAtualizada = this.mesclaEstruturas(
      estruturaAtual,
      estruturaScrap,
    );

    const precisaAtualizar =
      JSON.stringify(estruturaAtual) !== JSON.stringify(estruturaAtualizada);

    if (!precisaAtualizar) {
      return baseExistente.id;
    }

    const baseAtualizada = await prisma.baseDeDados.update({
      where: { id: baseExistente.id },
      data: {
        nome: integracaoNome,
        estrutura: estruturaAtualizada as unknown as Prisma.InputJsonValue,
        updatedAt: new Date(),
      },
      select: { id: true },
    });

    return baseAtualizada.id;
  }

  async salvaClientesDaBase(
    prisma: Prisma.TransactionClient,
    baseDeDadosId: number,
    estrutura: EstruturaBaseDadosDto[],
    linhas: Array<Record<string, unknown>>,
    identificadores: string[] = [],
  ): Promise<ResultadoPersistenciaClientes> {
    return this.clientesService.criaOuAtualizaClientesDaBase(
      prisma,
      baseDeDadosId,
      estrutura,
      linhas,
      identificadores,
    );
  }

  async create(
    dto: BasesDadosCreateDto,
    csvBuffer: Buffer,
    usuarioId?: number,
  ) {
    const csvStream = Readable.from(csvBuffer);
    const separator = this.detectCsvSeparator(csvBuffer);

    let parsedCsv: { list: Record<string, unknown>[]; total: number };
    try {
      parsedCsv = await this.csvParser.parse(
        csvStream,
        Object,
        undefined,
        undefined,
        { separator, strict: false },
      );
    } catch (error: unknown) {
      console.log('Erro ao parsear CSV:', error);
      throw new BadRequestException(
        'Nao foi possivel ler o CSV. Verifique o separador e o cabecalho do arquivo.',
      );
    }

    if (parsedCsv.total === 0) {
      throw new BadRequestException('CSV sem linhas para processamento');
    }

    const result = await this.prismaService.$transaction(async (prisma) => {
      const base = await prisma.baseDeDados.create({
        data: {
          nome: dto.nome,
          estrutura: dto.estrutura as unknown as Prisma.InputJsonValue,
          usuarioId,
        },
        select: {
          id: true,
          nome: true,
        },
      });

      await this.clientesService.criaClientesDaBase(
        base.id,
        dto.estrutura,
        parsedCsv.list,
      );

      return { base };
    });

    return {
      id: result.base.id,
    };
  }

  async update(id: number, dto: BasesDadosUpdateDto) {
    if (dto.nome === undefined && dto.estrutura === undefined) {
      throw new BadRequestException(
        'Informe ao menos um campo para atualizar: nome ou estrutura',
      );
    }

    return this.prismaService.$transaction(async (prisma) => {
      const baseAtual = await prisma.baseDeDados.findFirst({
        where: { id, deletedAt: null },
        select: { id: true },
      });

      if (!baseAtual) {
        throw new NotFoundException('Base de dados não encontrada');
      }

      const novaEstrutura = dto.estrutura;

      await prisma.baseDeDados.update({
        where: { id },
        data: {
          nome: dto.nome,
          estrutura:
            novaEstrutura !== undefined
              ? (novaEstrutura as unknown as Prisma.InputJsonValue)
              : undefined,
          updatedAt: new Date(),
        },
      });

      if (!novaEstrutura) {
        return {
          id,
          revalidacaoClientes: 0,
          tipoFoiAlterado: false,
        };
      }

      const clientesAtualizados =
        await this.clientesService.revalidaClientesDaBase(
          prisma,
          id,
          novaEstrutura,
        );

      return {
        id,
        revalidacaoClientes: clientesAtualizados,
        tipoFoiAlterado: true,
      };
    });
  }

  async delete(id: number) {
    return this.prismaService.$transaction(async (prisma) => {
      const baseAtual = await prisma.baseDeDados.findFirst({
        where: {
          id,
          deletedAt: null,
        },
        select: { id: true },
      });

      if (!baseAtual) {
        throw new NotFoundException('Base de dados não encontrada');
      }

      const dataAtualizacao = {
        deletedAt: new Date(),
        updatedAt: new Date(),
      };

      await prisma.baseDeDados.update({
        where: { id },
        data: dataAtualizacao,
      });

      const clientesAtualizados = await prisma.cliente.updateMany({
        where: {
          baseDeDadosId: id,
          deletedAt: null,
        },
        data: dataAtualizacao,
      });

      return {
        id,
        clientesSoftDeleted: clientesAtualizados.count,
      };
    });
  }

  private detectCsvSeparator(csvBuffer: Buffer) {
    const firstLine = csvBuffer.toString('utf-8').split(/\r?\n/, 1)[0]?.trim();

    if (!firstLine) {
      throw new BadRequestException('CSV vazio ou sem cabecalho');
    }

    const separators = [',', ';', '\t'] as const;

    return separators.reduce((bestSeparator, currentSeparator) => {
      const bestCount = firstLine.split(bestSeparator).length;
      const currentCount = firstLine.split(currentSeparator).length;

      return currentCount > bestCount ? currentSeparator : bestSeparator;
    }, separators[0]);
  }

  private parseJsonField<T>(value: unknown, fallback: T): T {
    if (value === null || value === undefined) return fallback;
    return typeof value === 'string' ? (JSON.parse(value) as T) : (value as T);
  }

  private toEstruturaArray(value: Prisma.JsonValue): EstruturaBaseDadosDto[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value as unknown as EstruturaBaseDadosDto[];
  }

  private montaEstruturaDaIntegracao(
    responseScrap: IntegracaoResponseDto[],
  ): EstruturaBaseDadosDto[] {
    return responseScrap.map((item) => ({
      cabecalho: item.nome,
      tipo: item.tipo,
      obrigatorio: false,
      rotulo: null,
    }));
  }

  private mesclaEstruturas(
    estruturaAtual: EstruturaBaseDadosDto[],
    estruturaNova: EstruturaBaseDadosDto[],
  ) {
    const existentes = new Map(
      estruturaAtual.map((item) => [item.cabecalho.trim(), item]),
    );

    return estruturaNova.map((item) => {
      const atual = existentes.get(item.cabecalho.trim());
      return {
        cabecalho: item.cabecalho,
        tipo: item.tipo,
        rotulo: atual?.rotulo ?? item.rotulo ?? null,
        obrigatorio: atual?.obrigatorio ?? item.obrigatorio ?? false,
      };
    });
  }
}
