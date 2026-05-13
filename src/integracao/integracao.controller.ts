import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { Permissao } from '../usuario/interfaces/permissao';
import { IntegracaoService } from './integracao.service';
import { IntegracaoCreateDto } from './dto/integracao-create-dto';
import { UsuarioAtual } from '../auth/decorators/usuario-atual.decorator';
import type { Payload } from '../auth/types/payload';
import { IntegracaoUpdateDto } from './dto/integracao-update-dto';
import { AlteraStatus } from '../common/dto/altera-status.dto';
import { Roles } from '../auth/decorators/permissoes';
import { IntegracaoFindAllQueryDto } from './dto/integracao-find-all-query.dto';

@Controller('integracoes')
@Roles(Permissao.EDITAR_INTEGRACOES)
export class IntegracaoController {
  constructor(private integracaoService: IntegracaoService) {}

  @Get()
  async findAll(@Query() query: IntegracaoFindAllQueryDto) {
    return this.integracaoService.findAll(query);
  }

  @Get(':id')
  async findById(@Param('id') idIntegracao: number) {
    return this.integracaoService.findById(idIntegracao);
  }

  @Post()
  async create(
    @Body() dto: IntegracaoCreateDto,
    @UsuarioAtual() usuario: Payload,
  ) {
    const idUsuario = usuario.sub;
    const idIntegracao = await this.integracaoService.create(dto, idUsuario);
    return { id: idIntegracao.id };
  }

  @Put(':id')
  async update(
    @Body() dto: IntegracaoUpdateDto,
    @UsuarioAtual() usuario: Payload,
    @Param('id') idIntegracao: number,
  ) {
    const idUsuario = usuario.sub;
    await this.integracaoService.update(dto, idUsuario, idIntegracao);
  }

  @Delete(':id')
  async delete(
    @UsuarioAtual() usuario: Payload,
    @Param('id') idIntegracao: number,
  ) {
    const idUsuario = usuario.sub;
    await this.integracaoService.delete(idIntegracao, idUsuario);
  }

  @Patch(':id/status')
  async alteraStatus(
    @UsuarioAtual() usuario: Payload,
    @Param('id') idIntegracao: number,
    @Body() alteraStatus: AlteraStatus,
  ) {
    const idUsuario = usuario.sub;
    await this.integracaoService.alteraStatus(
      idIntegracao,
      alteraStatus,
      idUsuario,
    );
  }

  @Patch(':id/ativar')
  async ativarIntegracao(
    @UsuarioAtual() usuario: Payload,
    @Param('id') idIntegracao: number,
  ) {
    const idUsuario = usuario.sub;
    await this.integracaoService.ativaIntegracao(idIntegracao, idUsuario);
  }
}
