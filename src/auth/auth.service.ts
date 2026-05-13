import { LoginDto } from './dto/login.dto';
import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AlterarSenhaDto } from './dto/alterar-senha.dto';
import { JwtService } from '@nestjs/jwt';
import { jwtConstants } from './constants';
import { randomUUID } from 'crypto';
import { Payload, PayloadRefreshToken, SessionMetadata } from './types/payload';
import { UsuariosService } from '../usuario/usuario.service';
import { PrismaService } from '../config/prisma.service';
import { verifyPassword } from '../config/argon';
import { Permissao } from '../usuario/interfaces/permissao';

@Injectable()
export class AuthService {
  constructor(
    private usuariosService: UsuariosService,
    private prismaService: PrismaService,
    private jwtService: JwtService,
  ) {}

  async login(loginDto: LoginDto, metadata: SessionMetadata) {
    const usuario =
      await this.usuariosService.findByEmailAndAtivoTrueAndDeletedAtNull(
        loginDto.email,
      );

    if (!usuario) throw new ForbiddenException();

    if (!(await verifyPassword(usuario?.senha, loginDto.senha)))
      throw new ForbiddenException();

    const {
      refreshToken,
      refreshTokenExpiresAt,
      accessToken,
      accessTokenExpiresAt,
    } = await this.generateTokens(
      usuario.id,
      usuario.admin,
      (usuario.permissoes as Permissao[]) || [],
      metadata,
    );

    return {
      id: usuario.id,
      admin: usuario.admin,
      permissoes: usuario.permissoes,
      refreshToken,
      refreshTokenExpiresAt,
      accessToken,
      accessTokenExpiresAt,
    };
  }

  async me(accessToken?: string) {
    if (!accessToken) throw new ForbiddenException();
    const payload = this.jwtService.decode<Payload>(accessToken);
    const usuario =
      await this.usuariosService.findByIdAndAtivoTrueAndDeletedAtNull(
        payload.sub,
      );

    if (!usuario) throw new ForbiddenException();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { senha, ...usuarioSemSenha } = usuario;
    return usuarioSemSenha;
  }

  async alteraSenha(accessToken?: string, alterarSenhaDto?: AlterarSenhaDto) {
    if (!accessToken || !alterarSenhaDto) throw new ForbiddenException();
    const payload = this.jwtService.decode<Payload>(accessToken);

    return await this.usuariosService.alterarSenha(
      payload.sub,
      alterarSenhaDto.antigaSenha,
      alterarSenhaDto.novaSenha,
    );
  }

  async generateTokens(
    id: number,
    admin: boolean,
    permissoes: Permissao[],
    metadata: SessionMetadata,
  ) {
    const payloadRefreshToken = {
      sub: id,
      sid: randomUUID(),
    };

    const payload = {
      sub: payloadRefreshToken.sub,
      sid: payloadRefreshToken.sid,
      admin,
      permissoes,
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: jwtConstants.secret,
      expiresIn: jwtConstants.expiresInAccessToken,
    });

    const refreshToken = await this.jwtService.signAsync(payloadRefreshToken, {
      secret: jwtConstants.secret,
      expiresIn: jwtConstants.expiresInRefreshToken,
    });

    const decodedRefreshToken =
      this.jwtService.decode<PayloadRefreshToken>(refreshToken);
    const decodedAccessToken = this.jwtService.decode<Payload>(accessToken);

    if (!decodedRefreshToken || typeof decodedRefreshToken === 'string') {
      throw new UnauthorizedException('Refresh token inválido');
    }

    if (!decodedAccessToken || typeof decodedAccessToken === 'string') {
      throw new UnauthorizedException('Access token inválido');
    }

    await this.criaSessao(decodedRefreshToken, metadata);
    return {
      accessToken,
      accessTokenExpiresAt: this.buildExpirationDate(decodedAccessToken.exp),
      refreshToken,
      refreshTokenExpiresAt: this.buildExpirationDate(decodedRefreshToken.exp),
    };
  }

  private async criaSessao(
    payload: PayloadRefreshToken,
    metadata: SessionMetadata,
  ) {
    await this.prismaService.$transaction(async (prisma) => {
      await prisma.sessao.updateMany({
        where: {
          usuarioId: payload.sub,
          revokedAt: null,
          expiredAt: {
            gt: new Date(),
          },
        },
        data: {
          revokedAt: new Date(),
        },
      });

      await prisma.sessao.create({
        data: {
          sid: payload.sid,
          usuarioId: payload.sub,
          dados: {
            ip: metadata.ip,
            userAgent: metadata.userAgent,
          },
          createdAt: new Date(payload.iat * 1000),
          expiredAt: new Date(payload.exp * 1000),
        },
        select: {
          id: true,
        },
      });
    });
  }

  async refresh(refreshToken?: string) {
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token ausente');
    }

    const payload = this.verifyRefreshToken(refreshToken);

    const sessao = await this.prismaService.sessao.findFirst({
      where: {
        sid: payload.sid,
        usuarioId: payload.sub,
        revokedAt: null,
        expiredAt: {
          gt: new Date(),
        },
      },
      select: {
        sid: true,
      },
    });

    if (!sessao) {
      throw new UnauthorizedException('Sessão inválida ou expirada');
    }

    const usuario =
      await this.usuariosService.findByIdAndAtivoTrueAndDeletedAtNull(
        payload.sub,
      );

    if (!usuario) {
      throw new ForbiddenException();
    }

    const accessToken = await this.assinaAccessToken(
      payload.sub,
      sessao.sid,
      usuario.admin,
      (usuario.permissoes as Permissao[]) || [],
    );
    const decodedAccessToken = this.jwtService.decode<Payload>(accessToken);

    if (!decodedAccessToken || typeof decodedAccessToken === 'string') {
      throw new UnauthorizedException('Access token inválido');
    }

    return {
      accessToken,
      accessTokenExpiresAt: this.buildExpirationDate(decodedAccessToken.exp),
      user: {
        id: usuario.id,
        admin: usuario.admin,
        permissoes: usuario.permissoes,
      },
    };
  }

  async logout(refreshToken?: string) {
    if (!refreshToken) return { success: true };

    const payload = this.verifyRefreshToken(refreshToken);

    await this.prismaService.sessao.updateMany({
      where: {
        sid: payload.sid,
        usuarioId: payload.sub,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });

    return { success: true };
  }

  verifyAccessToken(accessToken: string) {
    return this.jwtService.verify<Payload>(accessToken, {
      secret: jwtConstants.secret,
    });
  }

  verifyRefreshToken(refreshToken: string) {
    return this.jwtService.verify<PayloadRefreshToken>(refreshToken, {
      secret: jwtConstants.secret,
    });
  }

  private assinaAccessToken(
    id: number,
    sid: string,
    admin: boolean,
    permissoes: Permissao[],
  ) {
    return this.jwtService.signAsync(
      {
        sub: id,
        sid,
        admin,
        permissoes,
      },
      {
        secret: jwtConstants.secret,
        expiresIn: jwtConstants.expiresInAccessToken,
      },
    );
  }

  private buildExpirationDate(exp?: number) {
    if (!exp) {
      throw new UnauthorizedException('Token sem data de expiração');
    }

    return new Date(exp * 1000);
  }
}
