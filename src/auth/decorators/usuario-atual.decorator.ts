import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { RequestCookies } from '../types/requestCookies';

export const UsuarioAtual = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<RequestCookies>();
    return request.user;
  },
);
