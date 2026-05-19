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
import { AlteraStatus } from 'src/common/dto/altera-status.dto';
import { Permissao } from 'src/usuario/interfaces/permissao';
import { IntegracaoCampanhaCreateDto } from './dto/integracao-campanha-create.dto';
import { IntegracaoCampanhaFindAllQueryDto } from './dto/integracao-campanha-find-all-query.dto';
import { IntegracaoCampanhaUpdateDto } from './dto/integracao-campanha-update.dto';
import { IntegracaoCampanhaService } from './integracao-campanha.service';

@Controller('integracoes-campanhas')
@Roles(Permissao.EDITAR_INTEGRACOES)
export class IntegracaoCampanhaController {
  constructor(
    private readonly integracaoCampanhaService: IntegracaoCampanhaService,
  ) {}

  @Get()
  retornaTodos(@Query() query: IntegracaoCampanhaFindAllQueryDto) {
    return this.integracaoCampanhaService.retornaTodos(query);
  }

  @Get(':id')
  retornaPorId(@Param('id', ParseIntPipe) id: number) {
    return this.integracaoCampanhaService.retornaPorId(id);
  }

  @Post()
  cria(
    @Body() dto: IntegracaoCampanhaCreateDto,
    @UsuarioAtual() usuario: Payload,
  ) {
    return this.integracaoCampanhaService.cria(dto, usuario.sub);
  }

  @Put(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async atualiza(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: IntegracaoCampanhaUpdateDto,
  ) {
    await this.integracaoCampanhaService.atualiza(id, dto);
    return;
  }

  @Patch(':id/status')
  @HttpCode(HttpStatus.NO_CONTENT)
  async atualizaStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AlteraStatus,
  ) {
    await this.integracaoCampanhaService.atualizaStatus(id, dto.status);
    return;
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async exclui(@Param('id', ParseIntPipe) id: number) {
    await this.integracaoCampanhaService.exclui(id);
    return;
  }
}
