import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { LoginDto } from './dto/login.dto';
import { AuthService } from './auth.service';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { jwtConstants } from './constants';
import { Authenticated } from './decorators/permissoes';
import { AlterarSenhaDto } from './dto/alterar-senha.dto';
import { ApiBody } from '@nestjs/swagger';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @ApiBody({ type: LoginDto })
  async login(
    @Body() loginDto: LoginDto,
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    const usuario = await this.authService.login(loginDto, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
    res.setCookie('refreshToken', usuario.refreshToken, {
      httpOnly: true,
      secure: jwtConstants.development,
      sameSite: 'strict',
      path: '/',
      expires: usuario.refreshTokenExpiresAt,
    });
    res.setCookie('accessToken', usuario.accessToken, {
      httpOnly: true,
      secure: jwtConstants.development,
      path: '/',
      sameSite: 'strict',
      expires: usuario.accessTokenExpiresAt,
    });

    return;
  }

  @Patch('refresh')
  async refresh(
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    const refreshToken = req.cookies.refreshToken;

    try {
      const result = await this.authService.refresh(refreshToken);
      res.setCookie('accessToken', result.accessToken, {
        httpOnly: true,
        secure: jwtConstants.development,
        path: '/',
        sameSite: 'strict',
        expires: result.accessTokenExpiresAt,
      });
      return;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      throw new UnauthorizedException();
    }
  }

  @Get('me')
  @Authenticated()
  async me(@Req() req: FastifyRequest) {
    const accessToken = req.cookies.accessToken;
    return await this.authService.me(accessToken);
  }

  @Patch('altera-senha')
  @Authenticated()
  @HttpCode(HttpStatus.NO_CONTENT)
  async alteraSenha(
    @Req() req: FastifyRequest,
    @Body() alterarSenhaDto: AlterarSenhaDto,
  ) {
    const accessToken = req.cookies.accessToken;
    await this.authService.alteraSenha(accessToken, alterarSenhaDto);
    return;
  }

  @Post('logout')
  @Authenticated()
  async logout(
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    await this.authService.logout(req.cookies.refreshToken);
    res.clearCookie('refreshToken', {
      path: '/',
    });
    res.clearCookie('accessToken', {
      path: '/',
    });
    return { message: 'Logout successful' };
  }
}
