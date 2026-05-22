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
import { Roles } from 'src/auth/decorators/permissoes';
import { UsuarioAtual } from 'src/auth/decorators/usuario-atual.decorator';
import type { Payload } from 'src/auth/types/payload';
import { Permissao } from 'src/usuario/interfaces/permissao';
import { CampanhaAlteraStatusDto } from './dto/campanha-altera-status.dto';
import { CampanhaClientesQueryDto } from './dto/campanha-clientes-query.dto';
import { CampanhaCreateDto } from './dto/campanha-create.dto';
import { CampanhaFindAllQueryDto } from './dto/campanha-find-all-query.dto';
import { CampanhaUpdateDto } from './dto/campanha-update.dto';
import { CampanhaService } from './campanha.service';
import { ClienteCampanhaService } from './cliente-campanha.service';

@Controller('campanhas')
@Roles(Permissao.GERENCIAR_CAMPANHAS)
export class CampanhaController {
  constructor(
    private readonly campanhaService: CampanhaService,
    private readonly clienteCampanhaService: ClienteCampanhaService,
  ) {}

  @Get()
  retornaTodos(@Query() query: CampanhaFindAllQueryDto) {
    return this.campanhaService.retornaTodos(query);
  }

  @Get(':id')
  retornaPorId(@Param('id', ParseIntPipe) id: number) {
    return this.campanhaService.retornaPorId(id);
  }

  @Get(':id/clientes')
  findClientes(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: CampanhaClientesQueryDto,
  ) {
    return this.clienteCampanhaService.findClientes(id, query);
  }

  @Post()
  cria(@Body() dto: CampanhaCreateDto, @UsuarioAtual() usuario: Payload) {
    return this.campanhaService.cria(dto, usuario.sub);
  }

  @Put(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async atualiza(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CampanhaUpdateDto,
  ) {
    await this.campanhaService.atualiza(id, dto);
    return;
  }

  @Patch(':id/status')
  @HttpCode(HttpStatus.NO_CONTENT)
  async atualizaStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CampanhaAlteraStatusDto,
  ) {
    await this.campanhaService.atualizaStatus(id, dto.status);
    return;
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async exclui(@Param('id', ParseIntPipe) id: number) {
    await this.campanhaService.exclui(id);
    return;
  }
}
