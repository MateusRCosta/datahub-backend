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
@Roles(Permissao.EDITAR_CAMPANHAS)
export class TemplateController {
  constructor(private readonly templateService: TemplateService) {}

  @Get()
  findAll(@Query() query: TemplateFindAllQueryDto) {
    return this.templateService.findAll(query);
  }

  @Get(':id')
  findById(@Param('id', ParseIntPipe) id: number) {
    return this.templateService.findById(id);
  }

  @Post()
  create(@Body() dto: CreateTemplateDto, @UsuarioAtual() usuario: Payload) {
    return this.templateService.create(dto, usuario.sub);
  }

  @Put(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTemplateDto,
  ) {
    await this.templateService.update(id, dto);
    return;
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id', ParseIntPipe) id: number) {
    await this.templateService.delete(id);
    return;
  }
}
