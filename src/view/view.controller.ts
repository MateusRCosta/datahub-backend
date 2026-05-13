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
import { Permissao } from 'src/usuario/interfaces/permissao';
import { ViewExecuteQueryDto } from './dto/view-execute-query.dto';
import { ViewFindAllDto } from './dto/view-find-all-query.dto';
import { ViewCreateDto } from './dto/view-create.dto';
import { ViewUpdateDto } from './dto/view-update.dto';
import { ViewService } from './view.service';

@Controller('views')
@Roles(Permissao.VISUALIZAR_RELATORIOS)
export class ViewController {
  constructor(private readonly viewService: ViewService) {}

  @Get()
  findAll(@Query() query: ViewFindAllDto) {
    return this.viewService.findAll(query);
  }

  @Get(':id')
  findById(@Param('id', ParseIntPipe) id: number) {
    return this.viewService.findById(id);
  }

  @Get(':id/execute')
  execute(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: ViewExecuteQueryDto,
  ) {
    return this.viewService.execute(id, query);
  }

  @Post()
  create(@Body() dto: ViewCreateDto) {
    return this.viewService.create(dto);
  }

  @Put(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ViewUpdateDto,
  ) {
    await this.viewService.update(id, dto);
    return;
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id', ParseIntPipe) id: number) {
    await this.viewService.delete(id);
    return;
  }
}
