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
  findAll(@Query() query: IntegracaoCampanhaFindAllQueryDto) {
    return this.integracaoCampanhaService.findAll(query);
  }

  @Get(':id')
  findById(@Param('id', ParseIntPipe) id: number) {
    return this.integracaoCampanhaService.findById(id);
  }

  @Post()
  create(@Body() dto: IntegracaoCampanhaCreateDto) {
    return this.integracaoCampanhaService.create(dto);
  }

  @Put(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: IntegracaoCampanhaUpdateDto,
  ) {
    await this.integracaoCampanhaService.update(id, dto);
    return;
  }

  @Patch(':id/status')
  @HttpCode(HttpStatus.NO_CONTENT)
  async alteraStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AlteraStatus,
  ) {
    await this.integracaoCampanhaService.alteraStatus(id, dto.status);
    return;
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id', ParseIntPipe) id: number) {
    await this.integracaoCampanhaService.delete(id);
    return;
  }
}
