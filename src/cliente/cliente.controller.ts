import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Put,
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
  retornaTodos(@Query() query: ClienteFindAllQueryDto) {
    return this.clientesService.retornaTodos(query);
  }

  @Get(':id')
  retornaPorId(@Param('id', ParseIntPipe) id: number) {
    return this.clientesService.retornaPorId(id);
  }

  @Put(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async atualiza(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: ClienteUpdateDto,
  ) {
    await this.clientesService.atualiza(id, updateDto);
    return;
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async exclui(@Param('id', ParseIntPipe) id: number) {
    await this.clientesService.exclui(id);
    return;
  }
}
