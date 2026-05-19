import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  ParseIntPipe,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { Roles } from '../auth/decorators/permissoes';
import { Permissao } from '../usuario/interfaces/permissao';
import { BasesDadosService } from './base-dados.service';
import { BasesDadosFindAllQueryDto } from './dto/bases-dados-find-all-query.dto';
import { plainToInstance } from 'class-transformer';
import { BasesDadosCreateDto } from './dto/bases-dados-create.dto';
import { validateOrReject } from 'class-validator';
import { isMultipartValue } from './util/isMultipartValue';
import { MIMETYPES } from './util/constant';
import { BasesDadosUpdateDto } from './dto/bases-dados-update.dto';
import { RequestCookies } from 'src/auth/types/requestCookies';

@Controller('bases-dados')
@Roles(Permissao.EDITAR_BASE_DADOS)
export class BasesDadosController {
  constructor(private readonly basesDadosService: BasesDadosService) {}

  @Get()
  retornaTodos(@Query() query: BasesDadosFindAllQueryDto) {
    return this.basesDadosService.retornaTodos(query);
  }

  @Get(':id')
  retornaPorId(@Param('id', ParseIntPipe) id: number) {
    return this.basesDadosService.retornaPorId(id);
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

    const dto = plainToInstance(BasesDadosCreateDto, {
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

    return this.basesDadosService.cria(dto, buffer, req.user?.sub);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async atualiza(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: BasesDadosUpdateDto,
  ) {
    await this.basesDadosService.atualiza(id, dto);
    return;
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async exclui(@Param('id', ParseIntPipe) id: number) {
    await this.basesDadosService.exclui(id);
    return;
  }
}
