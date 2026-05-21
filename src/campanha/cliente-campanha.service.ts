import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PaginatedResponse } from 'src/common/interfaces/paginated-response.interface';
import { PrismaService } from 'src/config/prisma.service';
import { CLIENTES_CAMPANHA_BATCH_SIZE } from './campanha.constants';
import { CampanhaClientesQueryDto } from './dto/campanha-clientes-query.dto';
import {
  ClienteCampanhaFindAll,
  ClienteCampanhaPendente,
  STATUS_CLIENTE_CAMPANHA,
} from './types/cliente-campanha.type';
import { paginate } from 'src/common/utils/paginated-response';

@Injectable()
export class ClienteCampanhaService {
  constructor(private readonly prismaService: PrismaService) {}

  async findClientes(
    campanhaId: number,
    query: CampanhaClientesQueryDto,
  ): Promise<PaginatedResponse<ClienteCampanhaFindAll>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;
    const where: Prisma.ClienteCampanhaWhereInput = {
      campanhaId,
      clienteId: query.clienteId,
      status: query.status,
    };

    const [data, total] = await this.prismaService.$transaction([
      this.prismaService.clienteCampanha.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          status: true,
          clienteId: true,
          createdAt: true,
          updatedAt: true,
          cliente: {
            select: {
              id: true,
              dados: true,
            },
          },
        },
      }),
      this.prismaService.clienteCampanha.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  async criaClientesCampanha(
    campanhaId: number,
    clienteIds: number[],
  ): Promise<void> {
    if (clienteIds.length === 0) {
      return;
    }

    await this.prismaService.clienteCampanha.createMany({
      data: clienteIds.map((clienteId) => ({
        status: STATUS_CLIENTE_CAMPANHA.PENDENTE,
        campanhaId,
        clienteId,
      })),
      skipDuplicates: true,
    });
  }

  async buscaClientesPendentes(
    campanhaId: number,
  ): Promise<ClienteCampanhaPendente[]> {
    return this.prismaService.clienteCampanha.findMany({
      where: {
        campanhaId,
        status: STATUS_CLIENTE_CAMPANHA.PENDENTE,
      },
      take: CLIENTES_CAMPANHA_BATCH_SIZE,
      orderBy: { id: 'asc' },
      select: {
        id: true,
        clienteId: true,
        cliente: {
          select: {
            id: true,
            dados: true,
          },
        },
      },
    });
  }

  async atualizaStatusClientes(
    ids: number[],
    status: STATUS_CLIENTE_CAMPANHA,
  ): Promise<void> {
    if (ids.length === 0) {
      return;
    }

    await this.prismaService.clienteCampanha.updateMany({
      where: { id: { in: ids } },
      data: {
        status,
        updatedAt: new Date(),
      },
    });
  }

  async cancelaPendentes(campanhaId: number): Promise<void> {
    await this.prismaService.clienteCampanha.updateMany({
      where: {
        campanhaId,
        status: {
          in: [
            STATUS_CLIENTE_CAMPANHA.PENDENTE,
            STATUS_CLIENTE_CAMPANHA.EM_ENVIO,
          ],
        },
      },
      data: {
        status: STATUS_CLIENTE_CAMPANHA.CANCELADO,
        updatedAt: new Date(),
      },
    });
  }

  async contaPendentesOuEmEnvio(campanhaId: number): Promise<number> {
    return this.prismaService.clienteCampanha.count({
      where: {
        campanhaId,
        status: {
          in: [
            STATUS_CLIENTE_CAMPANHA.PENDENTE,
            STATUS_CLIENTE_CAMPANHA.EM_ENVIO,
          ],
        },
      },
    });
  }
}
