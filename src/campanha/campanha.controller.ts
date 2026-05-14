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
import { Permissao } from 'src/usuario/interfaces/permissao';
import { CampanhaAlteraStatusDto } from './dto/campanha-altera-status.dto';
import { CampanhaClientesQueryDto } from './dto/campanha-clientes-query.dto';
import { CampanhaCreateDto } from './dto/campanha-create.dto';
import { CampanhaFindAllQueryDto } from './dto/campanha-find-all-query.dto';
import { CampanhaUpdateDto } from './dto/campanha-update.dto';
import { CampanhaService } from './campanha.service';
import { ClienteCampanhaService } from './cliente-campanha.service';

@Controller('campanhas')
@Roles(Permissao.EDITAR_CAMPANHAS)
export class CampanhaController {
  constructor(
    private readonly campanhaService: CampanhaService,
    private readonly clienteCampanhaService: ClienteCampanhaService,
  ) {}

  @Get()
  findAll(@Query() query: CampanhaFindAllQueryDto) {
    return this.campanhaService.findAll(query);
  }

  @Get(':id')
  findById(@Param('id', ParseIntPipe) id: number) {
    return this.campanhaService.findById(id);
  }

  @Get(':id/clientes')
  findClientes(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: CampanhaClientesQueryDto,
  ) {
    return this.clienteCampanhaService.findClientes(id, query);
  }

  @Post()
  create(@Body() dto: CampanhaCreateDto) {
    return this.campanhaService.create(dto);
  }

  @Put(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CampanhaUpdateDto,
  ) {
    await this.campanhaService.update(id, dto);
    return;
  }

  @Patch(':id/status')
  @HttpCode(HttpStatus.NO_CONTENT)
  async alteraStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CampanhaAlteraStatusDto,
  ) {
    await this.campanhaService.alteraStatus(id, dto.status);
    return;
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id', ParseIntPipe) id: number) {
    await this.campanhaService.delete(id);
    return;
  }
}
