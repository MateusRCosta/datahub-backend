import { Injectable } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { createHash } from 'crypto';
import { normalizaDadosCliente } from './utils/dados-normalizer';
import { EstruturaBaseDadosDto } from 'src/base-dados/dto/bases-dados-estrutura.dto';

@Injectable()
export class ClientesCriacaoService {
  async criaOuAtualizaClientesDaBase(
    prisma: Prisma.TransactionClient | PrismaClient,
    baseDeDadosId: number,
    estrutura: EstruturaBaseDadosDto[],
    linhas: Array<Record<string, unknown>>,
    identificadores: string[] = [],
  ) {
    if (linhas.length === 0) {
      return {
        criados: 0,
        atualizados: 0,
      };
    }

    const chavesIdentificadoras =
      this.normalizaIdentificadores(identificadores);
    const clientesNormalizados = linhas.map((linha) => {
      const normalizado = normalizaDadosCliente(linha, estrutura);
      const hash = this.geraHash(normalizado.dados);
      const identificadorComposto = this.montaIdentificadorComposto(
        normalizado.dados,
        chavesIdentificadoras,
      );

      return {
        dados: normalizado.dados,
        validacao: normalizado.validacao,
        hash,
        identificadorComposto,
      };
    });

    const clientesComIdentificador = clientesNormalizados.filter(
      (cliente) => cliente.identificadorComposto !== null,
    );

    if (
      chavesIdentificadoras.length === 0 ||
      clientesComIdentificador.length === 0
    ) {
      const resultado = await prisma.cliente.createMany({
        data: clientesNormalizados.map((cliente) => ({
          baseDeDadosId,
          dados: cliente.dados as Prisma.InputJsonValue,
          validacao: cliente.validacao as Prisma.InputJsonValue,
          hash: cliente.hash,
        })),
      });

      return {
        criados: resultado.count,
        atualizados: 0,
      };
    }

    const filtrosExistentes = clientesComIdentificador.map((cliente) => ({
      AND: cliente.identificadorComposto?.campos.map((campo) => ({
        dados: {
          path: [campo.chave],
          equals: campo.valor,
        },
      })),
    }));

    const clientesExistentes = await prisma.cliente.findMany({
      where: {
        baseDeDadosId,
        deletedAt: null,
        OR: filtrosExistentes,
      },
      select: {
        id: true,
        dados: true,
      },
    });

    const clientesExistentesPorIdentificador = new Map<
      string,
      { id: number }
    >();

    for (const clienteExistente of clientesExistentes) {
      const dados = this.converteParaRegistro(clienteExistente.dados);
      const identificadorComposto = this.montaIdentificadorComposto(
        dados,
        chavesIdentificadoras,
      );

      if (identificadorComposto) {
        clientesExistentesPorIdentificador.set(identificadorComposto.chave, {
          id: clienteExistente.id,
        });
      }
    }

    const clientesParaCriar: Prisma.ClienteCreateManyInput[] = [];
    const atualizacoes: Array<Promise<unknown>> = [];

    for (const cliente of clientesNormalizados) {
      if (!cliente.identificadorComposto) {
        clientesParaCriar.push({
          baseDeDadosId,
          dados: cliente.dados as Prisma.InputJsonValue,
          validacao: cliente.validacao as Prisma.InputJsonValue,
          hash: cliente.hash,
        });
        continue;
      }

      const clienteExistente = clientesExistentesPorIdentificador.get(
        cliente.identificadorComposto.chave,
      );

      if (!clienteExistente) {
        clientesParaCriar.push({
          baseDeDadosId,
          dados: cliente.dados as Prisma.InputJsonValue,
          validacao: cliente.validacao as Prisma.InputJsonValue,
          hash: cliente.hash,
        });
        continue;
      }

      atualizacoes.push(
        prisma.cliente.update({
          where: { id: clienteExistente.id },
          data: {
            dados: cliente.dados as Prisma.InputJsonValue,
            validacao: cliente.validacao as Prisma.InputJsonValue,
            hash: cliente.hash,
            updatedAt: new Date(),
          },
          select: { id: true },
        }),
      );
    }

    const resultadoCriacao =
      clientesParaCriar.length > 0
        ? await prisma.cliente.createMany({
            data: clientesParaCriar,
          })
        : { count: 0 };

    if (atualizacoes.length > 0) {
      await Promise.all(atualizacoes);
    }

    return {
      criados: resultadoCriacao.count,
      atualizados: atualizacoes.length,
    };
  }

  async criaClientesDaBase(
    prisma: Prisma.TransactionClient | PrismaClient,
    baseDeDadosId: number,
    estrutura: EstruturaBaseDadosDto[],
    linhas: Array<Record<string, unknown>>,
  ) {
    const clientes = linhas.map((linha) => {
      const normalizado = normalizaDadosCliente(linha, estrutura);
      const hash = this.geraHash(normalizado.dados);

      return {
        baseDeDadosId,
        dados: normalizado.dados as Prisma.InputJsonValue,
        validacao: normalizado.validacao as Prisma.InputJsonValue,
        hash,
      };
    });
    if (clientes.length === 0) return false;

    const resultado = await prisma.cliente.createMany({
      data: clientes,
      skipDuplicates: true,
    });

    return resultado.count > 0;
  }

  async revalidaClientesDaBase(
    prisma: Prisma.TransactionClient,
    baseDeDadosId: number,
    estrutura: EstruturaBaseDadosDto[],
  ) {
    const clientes = await prisma.cliente.findMany({
      where: {
        baseDeDadosId,
        deletedAt: null,
      },
      select: {
        id: true,
        dados: true,
      },
    });

    const dataAtualizacao = new Date();

    const dadosCases: Prisma.Sql[] = [];
    const validacaoCases: Prisma.Sql[] = [];
    const ids: number[] = [];

    for (const cliente of clientes) {
      const dadosComoObjeto = this.converteParaRegistro(cliente.dados);
      const { dados, validacao } = normalizaDadosCliente(
        dadosComoObjeto,
        estrutura,
      );
      ids.push(cliente.id);

      dadosCases.push(
        Prisma.sql`
          WHEN id = ${cliente.id}
          THEN ${JSON.stringify(dados)}::jsonb
        `,
      );

      validacaoCases.push(
        Prisma.sql`
          WHEN id = ${cliente.id}
          THEN ${JSON.stringify(validacao)}::jsonb
        `,
      );
    }
    await prisma.$executeRaw`
      UPDATE clientes
      SET
        dados = CASE
          ${Prisma.join(dadosCases, '\n')}
        END,
        validacao = CASE
          ${Prisma.join(validacaoCases, '\n')}
        END,
        "updatedAt" = ${dataAtualizacao}
      WHERE id IN (${Prisma.join(ids)});
    `;
    return clientes.length;
  }

  geraHash(dados: Record<string, unknown>) {
    const sorted = this.ordenaObjeto(dados);
    const serialized = JSON.stringify(sorted);
    return createHash('sha256').update(serialized).digest('hex');
  }

  private ordenaObjeto(value: unknown): unknown {
    if (Array.isArray(value)) {
      return value.map((item) => this.ordenaObjeto(item));
    }

    if (value && typeof value === 'object') {
      return Object.keys(value as Record<string, unknown>)
        .sort((a, b) => a.localeCompare(b))
        .reduce<Record<string, unknown>>((acc, key) => {
          acc[key] = this.ordenaObjeto((value as Record<string, unknown>)[key]);
          return acc;
        }, {});
    }

    return value;
  }

  private converteParaRegistro(
    value: Prisma.JsonValue,
  ): Record<string, unknown> {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }

    return {};
  }

  private normalizaIdentificadores(identificadores: string[]): string[] {
    return identificadores
      .map((identificador) => identificador.trim())
      .filter((identificador) => identificador.length > 0);
  }

  private montaIdentificadorComposto(
    dados: Record<string, unknown>,
    identificadores: string[],
  ): {
    chave: string;
    campos: Array<{ chave: string; valor: string | number | boolean }>;
  } | null {
    if (identificadores.length === 0) return null;

    const campos = identificadores.map((identificador) => ({
      chave: identificador,
      valor: dados[identificador],
    }));

    const todosValidos = campos.every(
      (
        campo,
      ): campo is {
        chave: string;
        valor: string | number | boolean;
      } => this.valorIdentificadorValido(campo.valor),
    );

    if (!todosValidos) return null;

    return {
      chave: JSON.stringify(campos.map((campo) => [campo.chave, campo.valor])),
      campos,
    };
  }

  private valorIdentificadorValido(
    valor: unknown,
  ): valor is string | number | boolean {
    return (
      typeof valor === 'string' ||
      typeof valor === 'number' ||
      typeof valor === 'boolean'
    );
  }
}
