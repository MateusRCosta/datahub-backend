import {
  Controller,
  HttpCode,
  HttpStatus,
  Get,
  Post,
  Body,
  Put,
  Param,
  Delete,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { UsuarioAtual } from 'src/auth/decorators/usuario-atual.decorator';
import type { Payload } from 'src/auth/types/payload';
import { TemplateService } from './template.service';
import { CreateTemplateDto } from './dto/template-create.dto';
import { UpdateTemplateDto } from './dto/template-update-dto';
import { TemplateFindAllQueryDto } from './dto/template-find-all-query.dto';
import { Permissao } from 'src/usuario/interfaces/permissao';
import { Roles } from 'src/auth/decorators/permissoes';

@Controller('templates')
@Roles(Permissao.GERENCIAR_CAMPANHAS)
export class TemplateController {
  constructor(private readonly templateService: TemplateService) {}

  @Get()
  retornaTodos(@Query() query: TemplateFindAllQueryDto) {
    return this.templateService.retornaTodos(query);
  }

  @Get(':id')
  retornaPorId(@Param('id', ParseIntPipe) id: number) {
    return this.templateService.retornaPorId(id);
  }

  @Post()
  cria(@Body() dto: CreateTemplateDto, @UsuarioAtual() usuario: Payload) {
    return this.templateService.cria(dto, usuario.sub);
  }

  @Put(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async atualiza(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTemplateDto,
  ) {
    await this.templateService.atualiza(id, dto);
    return;
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async exclui(@Param('id', ParseIntPipe) id: number) {
    await this.templateService.exclui(id);
    return;
  }
}
