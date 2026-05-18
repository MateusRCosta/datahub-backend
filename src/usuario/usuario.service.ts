import { hashPassword, verifyPassword } from 'src/config/argon';
import { UsuarioCreateDto } from './dto/usuario-create.dto';
import { PrismaService } from 'src/config/prisma.service';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UsuarioUpdateDto } from './dto/usuario-update.dto';
import { Prisma } from '@prisma/client';
import { UsuarioFindAllQueryDto } from './dto/usuario-find-all-query.dto';
import { PaginatedResponse } from 'src/common/interfaces/paginated-response.interface';
import {
  buildPrismaOrderBy,
  buildPrismaWhere,
} from 'src/common/utils/prisma-filter-parser';
import {
  usuariosFilterConfig,
  usuariosOrderByFields,
} from './usuario.filter-config';
import { AlteraStatus } from 'src/common/dto/altera-status.dto';

@Injectable()
export class UsuariosService {
  constructor(private prismaService: PrismaService) {}

  private async revogarSessoesAtivas(
    prisma: Prisma.TransactionClient,
    usuarioId: number,
  ) {
    await prisma.sessao.updateMany({
      where: {
        usuarioId,
        revokedAt: null,
        expiredAt: {
          gt: new Date(),
        },
      },
      data: {
        revokedAt: new Date(),
      },
    });
  }

  async findAll(query: UsuarioFindAllQueryDto): Promise<
    PaginatedResponse<{
      id: number;
      nome: string;
      email: string;
      admin: boolean;
      ativo: boolean;
      permissoes: Prisma.JsonValue | null;
    }>
  > {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const where = buildPrismaWhere<Prisma.UsuarioWhereInput>(
      {
        id: query.id,
        nome: query.nome,
        email: query.email,
        admin: query.admin,
        ativo: query.ativo,
        permissoes: query.permissoes,
      },
      usuariosFilterConfig,
      { deletedAt: null },
    );

    const orderBy = buildPrismaOrderBy(
      query.orderBy,
      query.order,
      usuariosOrderByFields,
      'createdAt',
    );

    const [data, total] = await this.prismaService.$transaction([
      this.prismaService.usuario.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        select: {
          id: true,
          nome: true,
          email: true,
          admin: true,
          ativo: true,
          permissoes: true,
        },
      }),
      this.prismaService.usuario.count({ where }),
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
    if (Number.isNaN(id)) {
      throw new BadRequestException('Id inválido');
    }

    const usuario = await this.prismaService.usuario.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        nome: true,
        email: true,
        admin: true,
        permissoes: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!usuario) throw new NotFoundException('Usuário não encontrado');

    return usuario;
  }

  async findByEmailAndAtivoTrueAndDeletedAtNull(email: string) {
    const usuario = await this.prismaService.usuario.findFirst({
      where: { email, deletedAt: null, ativo: true },
      select: {
        id: true,
        nome: true,
        email: true,
        admin: true,
        permissoes: true,
        senha: true,
      },
    });

    return usuario;
  }

  async findByIdAndAtivoTrueAndDeletedAtNull(id: number) {
    const usuario = await this.prismaService.usuario.findFirst({
      where: { id, deletedAt: null, ativo: true },
      select: {
        id: true,
        nome: true,
        email: true,
        admin: true,
        permissoes: true,
        senha: true,
      },
    });
    return usuario;
  }

  async create(usuarioDto: UsuarioCreateDto) {
    return await this.prismaService.$transaction(async (prisma) => {
      const { nome, email, senha, admin, permissoes } = usuarioDto;

      const existeEmail = await prisma.usuario.findUnique({
        where: { email },
        select: { email: true },
      });

      if (existeEmail) throw new ConflictException('Email já registrado');

      const senhaHash = await hashPassword(senha);
      const id = await prisma.usuario.create({
        data: {
          nome,
          email,
          senha: senhaHash,
          admin,
          permissoes,
        },
        select: {
          id: true,
        },
      });

      return id;
    });
  }

  async update(updateDto: UsuarioUpdateDto, id: number) {
    return await this.prismaService.$transaction(async (prisma) => {
      const usuario = await prisma.usuario.findFirst({
        where: {
          id,
          deletedAt: null,
        },
        select: {
          id: true,
        },
      });

      if (!usuario) throw new NotFoundException('Usuário não encontrado');

      const data: Prisma.UsuarioUpdateInput = {};

      if (updateDto.nome) data.nome = updateDto.nome;
      if (updateDto.senha) data.senha = await hashPassword(updateDto.senha);
      if (updateDto.admin !== undefined) data.admin = updateDto.admin;
      if (updateDto.permissoes) data.permissoes = updateDto.permissoes;

      const alterouDadoSensivel =
        updateDto.senha !== undefined ||
        updateDto.admin !== undefined ||
        updateDto.permissoes !== undefined;

      const usuarioAtualizado = await prisma.usuario.update({
        where: { id },
        data,
        select: { id: true },
      });

      if (alterouDadoSensivel) {
        await this.revogarSessoesAtivas(prisma, id);
      }

      return usuarioAtualizado;
    });
  }

  async alterarSenha(id: number, antigaSenha: string, novaSenha: string) {
    return await this.prismaService.$transaction(async (prisma) => {
      const usuario = await prisma.usuario.findFirst({
        where: {
          id,
          deletedAt: null,
        },
        select: {
          id: true,
          senha: true,
        },
      });

      if (!usuario) throw new ForbiddenException();

      const senhaCorreta = await verifyPassword(usuario.senha, antigaSenha);

      if (!senhaCorreta) {
        throw new ForbiddenException('Senha antiga incorreta');
      }

      const novaSenhaHash = await hashPassword(novaSenha);

      await prisma.usuario.update({
        where: { id: usuario.id },
        data: {
          senha: novaSenhaHash,
          updatedAt: new Date(),
        },
        select: {
          id: true,
        },
      });

      await this.revogarSessoesAtivas(prisma, usuario.id);

      return;
    });
  }

  async alteraStatusAtivo(
    id: number,
    alteraStatus: AlteraStatus,
    sessaoUsuarioId: number,
  ) {
    if (id === sessaoUsuarioId) {
      throw new BadRequestException(
        'Nao pode alterar o status do seu proprio usuario',
      );
    }

    await this.prismaService.$transaction(async (prisma) => {
      const result = await prisma.$executeRaw`
     UPDATE "usuarios" SET 
     "ativo" = ${alteraStatus.status}, "updatedAt" = NOW() 
     WHERE id = ${id} AND "deletedAt" IS NULL AND id != ${sessaoUsuarioId}`;
      if (result === 0) throw new NotFoundException('Usuario não encontrado');
      await this.revogarSessoesAtivas(prisma, id);
    });
  }

  async delete(id: number, sessaoUsuarioId: number) {
    if (id === sessaoUsuarioId) {
      throw new BadRequestException('Nao pode excluir seu proprio usuario');
    }

    await this.prismaService.$transaction(async (prisma) => {
      const dataDeletado = new Date();

      const result = await prisma.$executeRaw`
      UPDATE "usuarios" SET
      "email" = "email" || '.' || ${dataDeletado.getTime()},
      "deletedAt" = ${dataDeletado},
      "updatedAt" = NOW()
      WHERE "id" = ${id} AND "deletedAt" IS NULL`;

      if (result === 0) throw new NotFoundException('Usuário não encontrado');

      await this.revogarSessoesAtivas(prisma, id);
    });
  }
}
