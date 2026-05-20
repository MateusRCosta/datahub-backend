import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import {
  buildPrismaOrderBy,
  buildPrismaWhere,
} from 'src/common/utils/prisma-filter-parser';
import { PrismaService } from 'src/config/prisma.service';
import { ClienteFindAllQueryDto } from './dto/cliente-find-all-query.dto';
import { ClienteUpdateDto } from './dto/cliente-update.dto';
import {
  clientesFilterConfig,
  clientesOrderByFields,
} from './cliente.filter-config';
import { ClientesCriacaoService } from './cliente-criacao.service';
import { EstruturaBaseDadosDto } from 'src/base-dados/dto/bases-dados-estrutura.dto';
import { normalizaDadosCliente } from './utils/dados-normalizer';

@Injectable()
export class ClientesService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly clientesCriacaoService: ClientesCriacaoService,
  ) {}

  async criaOuAtualizaClientesDaBase(
    prisma: Prisma.TransactionClient | PrismaClient,
    baseDeDadosId: number,
    estrutura: EstruturaBaseDadosDto[],
    linhas: Array<Record<string, unknown>>,
    identificadores: string[] = [],
  ) {
    return this.clientesCriacaoService.criaOuAtualizaClientesDaBase(
      prisma,
      baseDeDadosId,
      estrutura,
      linhas,
      identificadores,
    );
  }

  async criaClientesDaBase(
    prisma: Prisma.TransactionClient | PrismaClient,
    baseDeDadosId: number,
    estrutura: EstruturaBaseDadosDto[],
    linhas: Array<Record<string, unknown>>,
  ) {
    return this.clientesCriacaoService.criaClientesDaBase(
      prisma,
      baseDeDadosId,
      estrutura,
      linhas,
    );
  }

  async revalidaClientesDaBase(
    prisma: Prisma.TransactionClient,
    baseDeDadosId: number,
    estrutura: EstruturaBaseDadosDto[],
  ) {
    return this.clientesCriacaoService.revalidaClientesDaBase(
      prisma,
      baseDeDadosId,
      estrutura,
    );
  }

  private revalidaCliente(
    dados: Record<string, unknown>,
    estrutura: EstruturaBaseDadosDto[],
  ) {
    const { validacao } = normalizaDadosCliente(dados, estrutura);
    return validacao;
  }

  async retornaTodos(query: ClienteFindAllQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const where = buildPrismaWhere<Prisma.ClienteWhereInput>(
      {
        id: query.id,
        baseDeDadosId: query.baseDeDadosId,
        hash: query.hash,
      },
      clientesFilterConfig,
      { deletedAt: null },
    );

    const orderBy = buildPrismaOrderBy(
      query.orderBy,
      query.order,
      clientesOrderByFields,
      'id',
    );

    const [data, total] = await this.prismaService.$transaction([
      this.prismaService.cliente.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        select: {
          id: true,
          dados: true,
          validacao: true,
          baseDeDadosId: true,
        },
      }),
      this.prismaService.cliente.count({ where }),
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

  async buscaIdsPorBase(
    baseDeDadosId: number,
    skip: number,
    take: number,
  ): Promise<Array<{ id: number }>> {
    return this.prismaService.cliente.findMany({
      where: {
        baseDeDadosId,
        deletedAt: null,
      },
      select: { id: true },
      orderBy: { id: 'asc' },
      skip,
      take,
    });
  }

  async retornaPorId(id: number) {
    if (Number.isNaN(id)) {
      throw new BadRequestException('Id inválido');
    }

    const cliente = await this.prismaService.cliente.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        dados: true,
        validacao: true,
        baseDeDadosId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!cliente) throw new NotFoundException('Cliente não encontrado');

    return cliente;
  }

  async atualiza(id: number, dto: ClienteUpdateDto) {
    return await this.prismaService.$transaction(async (prisma) => {
      const cliente = await prisma.cliente.findFirst({
        where: {
          id,
          deletedAt: null,
        },
        select: {
          id: true,
          baseDeDados: {
            select: {
              id: true,
              estrutura: true,
            },
          },
          dados: true,
        },
      });

      if (!cliente) throw new NotFoundException('Cliente não encontrado');

      const data: Prisma.ClienteUpdateInput = {
        updatedAt: new Date(),
      };

      const validacao = this.revalidaCliente(
        dto.dados,
        cliente.baseDeDados.estrutura as unknown as EstruturaBaseDadosDto[],
      );

      data.dados = dto.dados as Prisma.InputJsonValue;
      data.hash = this.clientesCriacaoService.geraHash(dto.dados);
      data.validacao = validacao as Prisma.InputJsonValue;

      try {
        return await prisma.cliente.update({
          where: { id },
          data,
          select: {
            id: true,
          },
        });
      } catch (error: unknown) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          throw new ConflictException(
            'Já existe cliente com o mesmo hash nesta base de dados',
          );
        }
        throw error;
      }
    });
  }

  async exclui(id: number) {
    await this.prismaService.$transaction(async (prisma) => {
      const cliente = await prisma.cliente.findFirst({
        where: {
          id,
          deletedAt: null,
        },
        select: { id: true },
      });

      if (!cliente) throw new NotFoundException('Cliente não encontrado');

      await prisma.cliente.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          updatedAt: new Date(),
        },
      });
    });
  }
}
