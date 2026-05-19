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
  async retornaTodos(@Query() query: IntegracaoFindAllQueryDto) {
    return this.integracaoService.retornaTodos(query);
  }

  @Get(':id')
  async retornaPorId(@Param('id') idIntegracao: number) {
    return this.integracaoService.retornaPorId(idIntegracao);
  }

  @Post()
  async cria(
    @Body() dto: IntegracaoCreateDto,
    @UsuarioAtual() usuario: Payload,
  ) {
    const idUsuario = usuario.sub;
    const idIntegracao = await this.integracaoService.cria(dto, idUsuario);
    return { id: idIntegracao.id };
  }

  @Put(':id')
  async atualiza(
    @Body() dto: IntegracaoUpdateDto,
    @UsuarioAtual() usuario: Payload,
    @Param('id') idIntegracao: number,
  ) {
    const idUsuario = usuario.sub;
    await this.integracaoService.atualiza(dto, idUsuario, idIntegracao);
  }

  @Delete(':id')
  async exclui(
    @UsuarioAtual() usuario: Payload,
    @Param('id') idIntegracao: number,
  ) {
    const idUsuario = usuario.sub;
    await this.integracaoService.exclui(idIntegracao, idUsuario);
  }

  @Patch(':id/status')
  async atualizaStatus(
    @UsuarioAtual() usuario: Payload,
    @Param('id') idIntegracao: number,
    @Body() alteraStatus: AlteraStatus,
  ) {
    const idUsuario = usuario.sub;
    await this.integracaoService.atualizaStatus(
      idIntegracao,
      alteraStatus,
      idUsuario,
    );
  }

  @Patch(':id/ativar')
  async ativa(
    @UsuarioAtual() usuario: Payload,
    @Param('id') idIntegracao: number,
  ) {
    const idUsuario = usuario.sub;
    await this.integracaoService.ativa(idIntegracao, idUsuario);
  }
}
