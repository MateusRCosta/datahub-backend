import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { Roles } from 'src/auth/decorators/permissoes';
import { UsuarioAtual } from 'src/auth/decorators/usuario-atual.decorator';
import type { Payload } from 'src/auth/types/payload';
import { Permissao } from 'src/usuario/interfaces/permissao';
import { ViewExecuteQueryDto } from './dto/view-execute-query.dto';
import { ViewFindAllDto } from './dto/view-find-all-query.dto';
import { ViewCreateDto } from './dto/view-create.dto';
import { ViewUpdateDto } from './dto/view-update.dto';
import { ViewService } from './view.service';

@Controller('views')
@Roles(Permissao.GERENCIAR_VISUALIZACOES)
export class ViewController {
  constructor(private readonly viewService: ViewService) {}

  @Get()
  retornaTodos(@Query() query: ViewFindAllDto) {
    return this.viewService.retornaTodos(query);
  }

  @Get('/campos')
  @Roles(Permissao.GERENCIAR_CAMPANHAS, Permissao.GERENCIAR_VISUALIZACOES)
  retornaTodosParaCampanha(@Query() query: ViewFindAllDto) {
    return this.viewService.retornaTodosParaCampanha(query);
  }

  @Get(':id')
  retornaPorId(@Param('id', ParseIntPipe) id: number) {
    return this.viewService.retornaPorId(id);
  }

  @Get(':id/executa')
  executa(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: ViewExecuteQueryDto,
  ) {
    return this.viewService.executa(id, query);
  }

  @Post()
  cria(@Body() dto: ViewCreateDto, @UsuarioAtual() usuario: Payload) {
    return this.viewService.cria(dto, usuario.sub);
  }

  @Put(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async atualiza(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ViewUpdateDto,
  ) {
    await this.viewService.atualiza(id, dto);
    return;
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async exclui(@Param('id', ParseIntPipe) id: number) {
    await this.viewService.exclui(id);
    return;
  }
}
