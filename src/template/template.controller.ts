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
import { TemplateService } from './template.service';
import { CreateTemplateDto } from './dto/template-create.dto';
import { UpdateTemplateDto } from './dto/template-update-dto';
import { TemplateFindAllQueryDto } from './dto/template-find-all-query.dto';

@Controller('templates')
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
  create(@Body() dto: CreateTemplateDto) {
    return this.templateService.create(dto);
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
