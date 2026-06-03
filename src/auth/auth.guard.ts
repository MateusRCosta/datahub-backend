import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { RequestCookies } from './types/requestCookies';
import { Reflector } from '@nestjs/core';
import {
  ADMIN_ONLY_KEY,
  AUTHENTICATED_KEY,
  PERMISSOES_KEY,
} from './decorators/permissoes';
import { AuthService } from './auth.service';
import { Permissao } from '../usuario/interfaces/permissao';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const permissoesNecessarias = this.reflector.getAllAndOverride<Permissao[]>(
      PERMISSOES_KEY,
      [context.getHandler(), context.getClass()],
    );
    const requiresAuthentication = this.reflector.getAllAndOverride<boolean>(
      AUTHENTICATED_KEY,
      [context.getHandler(), context.getClass()],
    );
    const adminOnly = this.reflector.getAllAndOverride<boolean>(
      ADMIN_ONLY_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!permissoesNecessarias && !requiresAuthentication && !adminOnly) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestCookies>();
    const accessToken = request.cookies?.accessToken;

    if (!accessToken) {
      throw new UnauthorizedException();
    }

    try {
      const payload = this.authService.verifyAccessToken(accessToken);
      request.user = payload;

      const id = await this.authService.retornaSessaoIdPeloSidERevokedAtNull(
        payload.sid,
      );
      console.log(`sid: ${payload.sid}\n id: ${id}`);
      if (!id) throw new ForbiddenException();

      if (payload.admin) return true;

      if (adminOnly) {
        throw new ForbiddenException('Apenas administradores podem acessar');
      }

      if (!permissoesNecessarias || permissoesNecessarias.length === 0) {
        return true;
      }

      const permissoesUsuario = payload.permissoes || [];

      const temPermissao = permissoesUsuario.some((permissao) =>
        permissoesNecessarias.includes(permissao),
      );

      if (!temPermissao) {
        throw new ForbiddenException('Sem permissão para acessar esta rota');
      }
    } catch (error) {
      if (
        error instanceof UnauthorizedException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }

      throw new UnauthorizedException('Access token inválido');
    }
    return true;
  }
}
