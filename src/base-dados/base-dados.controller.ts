import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  Put,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { Roles } from '../auth/decorators/permissoes';
import { Permissao } from '../usuario/interfaces/permissao';
import { BaseDadosService } from './base-dados.service';
import { BaseDadosFindAllQueryDto } from './dto/base-dados-find-all-query.dto';
import { plainToInstance } from 'class-transformer';
import { BaseDadosCreateDto } from './dto/base-dados-create.dto';
import { validateOrReject } from 'class-validator';
import { isMultipartValue } from './util/isMultipartValue';
import { MIMETYPES } from './util/constant';
import { BaseDadosUpdateDto } from './dto/base-dados-update.dto';
import { RequestCookies } from 'src/auth/types/requestCookies';

@Controller('bases-dados')
@Roles(Permissao.GERENCIAR_BASE_DADOS)
export class BaseDadosController {
  constructor(private readonly baseDadosService: BaseDadosService) {}

  @Get()
  retornaTodos(@Query() query: BaseDadosFindAllQueryDto) {
    return this.baseDadosService.retornaTodos(query);
  }

  @Get(':id')
  retornaPorId(@Param('id', ParseIntPipe) id: number) {
    return this.baseDadosService.retornaPorId(id);
  }

  @Post()
  async cria(@Req() req: FastifyRequest & RequestCookies) {
    const data = await req.file();

    if (!data) throw new BadRequestException('Arquivo é obrigatório');

    if (!data.file)
      throw new BadRequestException('Envie um arquivo CSV válido no form-data');

    if (!MIMETYPES.includes(data.mimetype))
      throw new BadRequestException(
        `Arquivo deve ser CSV. Recebido: ${data.mimetype}`,
      );

    const buffer = await data.toBuffer();

    const nomeField = data.fields['nome'];
    const estruturaField = data.fields['estrutura'];

    if (!isMultipartValue(nomeField) || !isMultipartValue(estruturaField)) {
      throw new BadRequestException(
        'Campos obrigatórios ausentes ou inválidos',
      );
    }

    const nome = nomeField.value;
    const estruturaRaw = estruturaField.value;

    let parsedEstrutura: unknown;
    try {
      parsedEstrutura = JSON.parse(estruturaRaw);
    } catch {
      throw new BadRequestException('Estrutura inválida (JSON)');
    }

    const dto = plainToInstance(BaseDadosCreateDto, {
      nome,
      estrutura: parsedEstrutura,
    });

    try {
      await validateOrReject(dto, {
        whitelist: true,
        forbidNonWhitelisted: true,
      });
    } catch (errors) {
      throw new BadRequestException(errors);
    }

    return this.baseDadosService.cria(dto, buffer, req.user?.sub);
  }

  @Put(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async atualiza(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: BaseDadosUpdateDto,
  ) {
    await this.baseDadosService.atualiza(id, dto);
    return;
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async exclui(@Param('id', ParseIntPipe) id: number) {
    await this.baseDadosService.exclui(id);
    return;
  }
}
