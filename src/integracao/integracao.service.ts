import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { Integracao, Prisma } from '@prisma/client';
import { PrismaService } from '../config/prisma.service';
import { AlteraStatus } from '../common/dto/altera-status.dto';
import {
  buildPrismaOrderBy,
  buildPrismaWhere,
} from 'src/common/utils/prisma-filter-parser';
import { IntegracaoExecucaoService } from './integracao-execucao.service';
import {
  integracoesFilterConfig,
  integracoesOrderByFields,
} from './integracao.filter-config';
import { IntegracaoCreateDto } from './dto/integracao-create-dto';
import { IntegracaoFindAllQueryDto } from './dto/integracao-find-all-query.dto';
import { IntegracaoUpdateDto } from './dto/integracao-update-dto';
import { STATUS_JOB } from './types/integracoes-execucao.type';
import { IntegracaoSchedularService } from './integracao-schedular.service';
import { paginate } from 'src/common/utils/paginated-response';

@Injectable()
export class IntegracaoService {
  constructor(
    private prismaService: PrismaService,
    private integracaoExecucaoService: IntegracaoExecucaoService,
    @Inject(forwardRef(() => IntegracaoSchedularService))
    private integracaoSchedularService: IntegracaoSchedularService,
  ) {}

  async retornaTodos(query: IntegracaoFindAllQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const where = buildPrismaWhere(
      {
        id: query.id,
        nome: query.nome,
        usuarioId: query.usuarioId,
      },
      integracoesFilterConfig,
      { deletedAt: null },
    );

    const orderBy = buildPrismaOrderBy(
      query.orderBy,
      query.order,
      integracoesOrderByFields,
      'createdAt',
    );

    const [data, total] = await this.prismaService.$transaction([
      this.prismaService.integracao.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        select: {
          id: true,
          nome: true,
          usuario: {
            select: {
              nome: true,
            },
          },
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prismaService.integracao.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  async retornaPorId(id: number) {
    const integracao = await this.prismaService.integracao.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        nome: true,
        usuario: {
          select: {
            id: true,
            nome: true,
          },
        },
        status: true,
        limitDeRequisicaoPorMin: true,
        horaExecucao: true,
        urlAuth: true,
        metodoAuth: true,
        headersAuth: true,
        variaveisAuth: true,
        bodyAuth: true,
        responseAuth: true,
        urlRefresh: true,
        metodoRefresh: true,
        headersRefresh: true,
        variaveisRefresh: true,
        bodyRefresh: true,
        responseRefresh: true,
        urlScrap: true,
        metodoScrap: true,
        headersScrap: true,
        variaveisScrap: true,
        bodyScrap: true,
        responseScrap: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!integracao) {
      throw new NotFoundException('Integracao nao encontrada');
    }

    return integracao;
  }

  async cria(dto: IntegracaoCreateDto, idUsuario: number) {
    try {
      const integracao = await this.prismaService.integracao.create({
        data: {
          nome: dto.nome,
          limitDeRequisicaoPorMin: dto.limitDeRequisicaoPorMin,
          horaExecucao: dto.horaExecucao,
          urlAuth: dto.urlAuth ?? undefined,
          metodoAuth: dto.metodoAuth ?? undefined,
          headersAuth: this.toPrismaJson(dto.headersAuth),
          bodyAuth: dto.bodyAuth ?? undefined,
          responseAuth: this.toPrismaJson(dto.responseAuth),
          variaveisAuth: this.toPrismaJson(dto.variaveisAuth),
          urlRefresh: dto.urlRefresh ?? undefined,
          metodoRefresh: dto.metodoRefresh ?? undefined,
          headersRefresh: this.toPrismaJson(dto.headersRefresh),
          bodyRefresh: dto.bodyRefresh ?? undefined,
          responseRefresh: this.toPrismaJson(dto.responseRefresh),
          variaveisRefresh: this.toPrismaJson(dto.variaveisRefresh),
          urlScrap: dto.urlScrap,
          metodoScrap: dto.metodoScrap,
          headersScrap: this.toPrismaJson(dto.headersScrap),
          bodyScrap: dto.bodyScrap ?? undefined,
          responseScrap: dto.responseScrap as unknown as Prisma.InputJsonValue,
          variaveisScrap: this.toPrismaJson(dto.variaveisScrap),
          usuarioId: idUsuario,
          status: false,
        },
        select: {
          id: true,
        },
      });

      return integracao;
    } catch (error: unknown) {
      console.error('Erro ao criar integracao:', error);
      throw new InternalServerErrorException('Erro interno do servidor');
    }
  }

  async atualiza(
    dto: IntegracaoUpdateDto,
    idUsuario: number,
    idIntegracao: number,
  ) {
    try {
      void idUsuario;
      const dataPreenchida = Object.fromEntries(
        Object.entries(dto as unknown as Record<string, unknown>).filter(
          ([, value]) => value !== undefined,
        ),
      ) as Record<string, unknown>;

      const dataFinal = Object.fromEntries(
        Object.entries(dataPreenchida).map(([key, value]) => [
          key,
          typeof value === 'string' ? value : value,
        ]),
      );

      const integracao =
        await this.buscaIntegracaoNaoDeletadaOuFalha(idIntegracao);

      const resultado = await this.prismaService.integracao.updateManyAndReturn(
        {
          where: { id: idIntegracao, deletedAt: null },
          data: dataFinal,
          select: {
            horaExecucao: true,
          },
        },
      );

      if (resultado.length === 0) {
        throw new NotFoundException('Integracao nao encontrada ou ja deletada');
      }
      const horarioMudou = this.horarioExecucaoMudou(
        dto.horaExecucao,
        integracao.horaExecucao,
      );

      if (horarioMudou && integracao.status) {
        await this.integracaoSchedularService.aplicaAgendamentoPorStatus(
          {
            ...integracao,
            horaExecucao: dto.horaExecucao,
          },
          integracao.status,
        );
      }

      return { id: idIntegracao };
    } catch (error: unknown) {
      if (error instanceof NotFoundException) throw error;
      console.error('Erro ao atualizar integracao:', error);
      throw new InternalServerErrorException('Erro interno do servidor');
    }
  }

  async exclui(idIntegracao: number, idUsuario: number) {
    try {
      void idUsuario;

      const integracao =
        await this.buscaIntegracaoNaoDeletadaOuFalha(idIntegracao);
      await this.integracaoSchedularService.aplicaAgendamentoPorStatus(
        integracao,
        false,
      );

      const resultado = await this.prismaService.integracao.updateMany({
        where: { id: idIntegracao, deletedAt: null },
        data: { deletedAt: new Date() },
      });

      if (resultado.count === 0) {
        throw new NotFoundException('Integracao nao encontrada ou ja deletada');
      }

      return { id: idIntegracao };
    } catch (error: unknown) {
      if (error instanceof NotFoundException) throw error;
      console.error('Erro ao deletar integracao:', error);
      throw new InternalServerErrorException('Erro interno do servidor');
    }
  }

  async atualizaStatus(
    idIntegracao: number,
    alteraStatus: AlteraStatus,
    idUsuario: number,
  ) {
    try {
      void idUsuario;

      const resultado = await this.prismaService.integracao.updateManyAndReturn(
        {
          where: { id: idIntegracao, deletedAt: null },
          data: { status: alteraStatus.status },
          select: {
            horaExecucao: true,
          },
        },
      );

      if (resultado.length === 0) {
        throw new NotFoundException('Integracao nao encontrada ou ja deletada');
      }

      await this.integracaoSchedularService.aplicaAgendamentoPorStatus(
        { id: idIntegracao, horaExecucao: resultado[0].horaExecucao },
        alteraStatus.status,
      );

      return { id: idIntegracao };
    } catch (error: unknown) {
      if (error instanceof NotFoundException) throw error;
      console.error('Erro ao alterar status da integracao:', error);
      throw new InternalServerErrorException('Erro interno do servidor');
    }
  }

  async ativa(idIntegracao: number, idUsuario: number) {
    try {
      const integracao = await this.prismaService.integracao.findFirst({
        where: { id: idIntegracao, deletedAt: null },
      });

      if (!integracao) throw new NotFoundException('Integracao nao encontrada');

      const integracaoAtiva = { ...integracao, status: true };

      await this.prismaService.integracao.update({
        where: { id: integracao.id },
        data: { status: true },
      });

      await this.integracaoSchedularService.aplicaAgendamentoPorStatus(
        integracaoAtiva,
        integracaoAtiva.status,
      );

      void this.integracaoExecucaoService
        .ativa(integracaoAtiva, idUsuario)
        .catch((error: unknown) => {
          console.error(
            `Erro na execucao assincrona da integracao ${integracao.id}:`,
            error,
          );
        });
    } catch (error: unknown) {
      if (error instanceof NotFoundException) throw error;
      console.error('Erro ao ativar integracao:', error);
      throw new InternalServerErrorException('Erro interno do servidor');
    }
  }

  async executa(integracaoId: number, jobId: number): Promise<void> {
    const integracao =
      await this.buscaIntegracaoNaoDeletadaOuFalha(integracaoId);

    if (!integracao.status) {
      throw new BadRequestException('Integracao inativa nao pode executar job');
    }

    try {
      await this.integracaoExecucaoService.executa(integracao);

      await this.integracaoSchedularService.atualizaStatus(
        jobId,
        STATUS_JOB.COMPLETO,
      );
    } catch (error: unknown) {
      await this.integracaoSchedularService.atualizaStatus(
        jobId,
        STATUS_JOB.ERRO,
      );

      throw error;
    }
  }

  private toPrismaJson(value: unknown) {
    return value === undefined
      ? undefined
      : (value as unknown as Prisma.InputJsonValue);
  }

  private async buscaIntegracaoNaoDeletadaOuFalha(
    id: number,
  ): Promise<Integracao> {
    const integracao = await this.prismaService.integracao.findFirst({
      where: { id, deletedAt: null },
    });

    if (!integracao) {
      throw new NotFoundException('Integracao nao encontrada ou ja deletada');
    }

    return integracao;
  }

  private horarioExecucaoMudou(
    novaHoraExecucao: number | undefined,
    horaExecucaoAtual: number,
  ): boolean {
    return (
      novaHoraExecucao !== undefined && novaHoraExecucao !== horaExecucaoAtual
    );
  }
}
