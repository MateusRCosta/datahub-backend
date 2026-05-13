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
  Query,
} from '@nestjs/common';
import { Roles } from 'src/auth/decorators/permissoes';
import { Permissao } from 'src/usuario/interfaces/permissao';
import { ClientesService } from './cliente.service';
import { ClienteFindAllQueryDto } from './dto/cliente-find-all-query.dto';
import { ClienteUpdateDto } from './dto/cliente-update.dto';

@Controller('clientes')
@Roles(Permissao.EDITAR_BASE_DADOS)
export class ClientesController {
  constructor(private readonly clientesService: ClientesService) {}

  @Get()
  findAll(@Query() query: ClienteFindAllQueryDto) {
    return this.clientesService.buscaTodos(query);
  }

  @Get(':id')
  findById(@Param('id', ParseIntPipe) id: number) {
    return this.clientesService.buscaPorId(id);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: ClienteUpdateDto,
  ) {
    await this.clientesService.atualiza(id, updateDto);
    return;
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id', ParseIntPipe) id: number) {
    await this.clientesService.remove(id);
    return;
  }
}
