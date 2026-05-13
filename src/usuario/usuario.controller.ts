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

@Controller('usuarios')
@AdminOnly()
export class UsuariosController {
  constructor(private usuariosService: UsuariosService) {}

  @Get()
  findAll(@Query() query: UsuarioFindAllQueryDto) {
    return this.usuariosService.findAll(query);
  }

  @Get(':id')
  findById(@Param('id', ParseIntPipe) id: number) {
    return this.usuariosService.findById(id);
  }

  @Post()
  async create(@Body() usuarioCreateDto: UsuarioCreateDto) {
    await this.usuariosService.create(usuarioCreateDto);
    return;
  }

  @Put(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() usuarioUpdateDto: UsuarioUpdateDto,
  ) {
    await this.usuariosService.update(usuarioUpdateDto, id);
    return;
  }

  @Patch(':id/ativo')
  @HttpCode(HttpStatus.NO_CONTENT)
  async alteraStatusAtivo(
    @Param('id', ParseIntPipe) id: number,
    @Body() alteraStatus: AlteraStatus,
  ) {
    await this.usuariosService.alteraStatusAtivo(id, alteraStatus);
    return;
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id', ParseIntPipe) id: number) {
    await this.usuariosService.delete(id);
    return;
  }
}
