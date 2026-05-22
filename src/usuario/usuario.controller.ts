import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { UsuariosService } from './usuario.service';
import { UsuarioCreateDto } from './dto/usuario-create.dto';
import { UsuarioFindAllQueryDto } from './dto/usuario-find-all-query.dto';
import { UsuarioUpdateDto } from './dto/usuario-update.dto';
import { AdminOnly } from 'src/auth/decorators/permissoes';
import { AlteraStatus } from 'src/common/dto/altera-status.dto';
import { UsuarioAtual } from 'src/auth/decorators/usuario-atual.decorator';
import type { Payload } from 'src/auth/types/payload';

@Controller('usuarios')
@AdminOnly()
export class UsuariosController {
  constructor(private usuariosService: UsuariosService) {}

  @Get()
  retornaTodos(@Query() query: UsuarioFindAllQueryDto) {
    return this.usuariosService.retornaTodos(query);
  }

  @Get(':id')
  retornaPorId(@Param('id', ParseIntPipe) id: number) {
    return this.usuariosService.retornaPorId(id);
  }

  @Post()
  async cria(@Body() usuarioCreateDto: UsuarioCreateDto) {
    await this.usuariosService.cria(usuarioCreateDto);
    return;
  }

  @Put(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async atualiza(
    @Param('id', ParseIntPipe) id: number,
    @Body() usuarioUpdateDto: UsuarioUpdateDto,
  ) {
    await this.usuariosService.atualiza(usuarioUpdateDto, id);
    return;
  }

  @Patch(':id/status')
  @HttpCode(HttpStatus.NO_CONTENT)
  async atualizaStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() alteraStatus: AlteraStatus,
    @UsuarioAtual() usuario: Payload,
  ) {
    await this.usuariosService.atualizaStatus(id, alteraStatus, usuario.sub);
    return;
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async exclui(
    @Param('id', ParseIntPipe) id: number,
    @UsuarioAtual() usuario: Payload,
  ) {
    await this.usuariosService.exclui(id, usuario.sub);
    return;
  }
}
