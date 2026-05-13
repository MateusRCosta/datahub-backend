import { HttpService } from '@nestjs/axios';
import { BadRequestException, Injectable } from '@nestjs/common';
import { Integracao } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import lodash from 'lodash';
import { firstValueFrom } from 'rxjs';
import {
  dataDDMMYYYYMaiorQueHoje,
  incrementaData,
} from 'src/common/utils/date-utils';
import { PrismaService } from 'src/config/prisma.service';
import { IntegracaoHeaderDto } from './dto/integracao-header-dto';
import { IntegracaoResponseDto } from './dto/integracao-response-dto';
import { IntegracaoVariavelDto } from './dto/integracao-variavel-dto';
import { IntegracaoVariavelIncrementoDto } from './dto/integracao-variavel-incremento-dto';
import {
  ConfiguracaoEtapa,
  ControleLimiteRequisicao,
  ContextoIntegracao,
  DadosCliente,
  ResultadoExecucao,
  RespostaEtapa,
  TipoRequisicao,
} from './types/integracoes-execucao.type';
import { regexChavesVariaveis } from './utils/constants';
import { METODO } from './utils/type';
import { BasesDadosService } from 'src/base-dados/base-dados.service';
import { TipoCampo } from 'src/base-dados/util/type';

@Injectable()
export class IntegracaoExecucaoService {
  constructor(
    private prismaService: PrismaService,
    private httpService: HttpService,
    private basesDadosService: BasesDadosService,
  ) {}

  async ativaIntegracao(integracao: Integracao, _idUsuario: number) {
    void _idUsuario;
    await this.executaIntegracao(integracao);
  }

  async executaIntegracao(
    integracao: Integracao,
  ): Promise<ResultadoExecucao<void>> {
    const controleLimite = this.criaControleLimiteRequisicao(
      integracao.limitDeRequisicaoPorMin,
    );

    console.log(`[Integracao ${integracao.id}] Iniciando execucao`);

    const baseIntegracao = await this.prismaService.$transaction((prisma) =>
      this.basesDadosService.garanteBaseDaIntegracao(
        prisma,
        integracao.id,
        integracao.usuarioId,
        integracao.nome,
        integracao.responseScrap,
      ),
    );
    console.log(
      `[Integracao ${integracao.id}] Base garantida com id ${baseIntegracao}`,
    );

    const resultadoContextoInicial = await this.criaContextoInicial(
      integracao,
      controleLimite,
    );
    if (!resultadoContextoInicial.sucesso || !resultadoContextoInicial.dados) {
      this.lancaFalhaExecucao(integracao.id, resultadoContextoInicial);
    }
    console.log(
      `[Integracao ${integracao.id}] Contexto inicializado com sucesso`,
    );
    return this.executaLoopScrap(
      integracao,
      resultadoContextoInicial.dados,
      baseIntegracao,
      controleLimite,
    );
  }

  private async criaContextoInicial(
    integracao: Integracao,
    controleLimite: ControleLimiteRequisicao,
  ): Promise<ResultadoExecucao<ContextoIntegracao>> {
    if (!integracao.urlAuth) {
      console.log(`[Integracao ${integracao.id}] Auth nao configurado`);
      return {
        sucesso: true,
        statusCode: 200,
        message: 'Autenticacao nao configurada',
        dados: [],
      };
    }

    return this.executaEtapaContexto(integracao, 'AUTH', [], controleLimite);
  }

  private async executaLoopScrap(
    integracao: Integracao,
    contextoInicial: ContextoIntegracao,
    baseDeDadosId: number,
    controleLimite: ControleLimiteRequisicao,
  ): Promise<ResultadoExecucao<void>> {
    let contexto = this.mergeVariaveisContexto(
      this.parseJsonField<unknown[]>(integracao.variaveisScrap, []),
      contextoInicial,
    );
    const variavelDelimitadora = this.encontraVariavelDelimitadora(
      integracao.variaveisScrap,
    );
    const incrementoDelimitador =
      this.obtemIncrementoVariavel(variavelDelimitadora);
    const totalIteracoes = this.obtemTotalIteracoes(incrementoDelimitador);
    const estruturaDaBase = this.montaEstruturaDaIntegracao(
      integracao.responseScrap,
    );
    const identificadoresDaBase = this.obtemIdentificadoresDaIntegracao(
      integracao.responseScrap,
    );
    console.log(
      `[Integracao ${integracao.id}] Iniciando loop de scrap com totalIteracoes=${totalIteracoes}`,
    );

    for (let tentativa = 0; tentativa < totalIteracoes; tentativa++) {
      console.log(
        `[Integracao ${integracao.id}] Executando tentativa ${tentativa + 1} de scrap`,
      );
      const resultadoColeta = await this.executaColetaComRefresh(
        integracao,
        contexto,
        controleLimite,
      );
      if (!resultadoColeta.sucesso || !resultadoColeta.dados) {
        this.lancaFalhaExecucao(integracao.id, resultadoColeta);
      }

      await this.persisteClientesEmLote(
        baseDeDadosId,
        estruturaDaBase,
        resultadoColeta.dados,
        identificadoresDaBase,
      );
      console.log(
        `[Integracao ${integracao.id}] Persistencia concluida para ${resultadoColeta.dados.length} clientes`,
      );

      if (!variavelDelimitadora) continue;

      const valorAtual = this.obtemValorVariavel(
        contexto,
        variavelDelimitadora.nome,
      );
      console.log(
        `[Integracao ${integracao.id}] Valor atual da delimitadora ${variavelDelimitadora.nome}: ${valorAtual}`,
      );
      const resultadoIncremento = this.incrementaVariavelDelimitadora(
        contexto,
        variavelDelimitadora.nome,
        variavelDelimitadora.tipo,
        valorAtual,
        incrementoDelimitador?.limiteDataAtual ?? false,
      );

      contexto = resultadoIncremento.contexto;
      console.log(
        `[Integracao ${integracao.id}] Variavel delimitadora ${variavelDelimitadora.nome} incrementada`,
      );
      if (!resultadoIncremento.deveContinuar) {
        console.log(
          `[Integracao ${integracao.id}] Loop encerrado por limite da variavel delimitadora`,
        );
        break;
      }
    }

    console.log(`[Integracao ${integracao.id}] Execucao finalizada`);
    return {
      sucesso: true,
      statusCode: 200,
      message: 'Integracao executada com sucesso',
      dados: undefined,
    };
  }

  private async executaColetaComRefresh(
    integracao: Integracao,
    contexto: ContextoIntegracao,
    controleLimite: ControleLimiteRequisicao,
  ): Promise<ResultadoExecucao<DadosCliente[]>> {
    const resultadoScrap = await this.executaEtapaScrap(
      integracao,
      contexto,
      controleLimite,
    );
    console.log(
      `[Integracao ${integracao.id}] Resultado do SCRAP: sucesso=${resultadoScrap.sucesso} status=${resultadoScrap.statusCode}`,
    );

    if (resultadoScrap.sucesso) {
      return resultadoScrap;
    }

    if (!this.isErroHttpCliente(resultadoScrap.statusCode)) {
      return resultadoScrap;
    }

    if (!integracao.urlRefresh) {
      console.log(
        `[Integracao ${integracao.id}] SCRAP com falha e refresh nao configurado`,
      );
      return {
        sucesso: false,
        statusCode: resultadoScrap.statusCode,
        message: `A requisicao SCRAP retornou ${resultadoScrap.statusCode} e nao ha configuracao de refresh`,
        dados: null,
      };
    }
    console.log(
      `[Integracao ${integracao.id}] SCRAP com falha ${resultadoScrap.statusCode}, iniciando refresh`,
    );

    const resultadoRefresh = await this.executaEtapaContexto(
      integracao,
      'REFRESH',
      contexto,
      controleLimite,
    );

    if (!resultadoRefresh.sucesso || !resultadoRefresh.dados) {
      console.log(
        `[Integracao ${integracao.id}] Refresh falhou: ${resultadoRefresh.message}`,
      );
      return {
        sucesso: false,
        statusCode: resultadoRefresh.statusCode,
        message: `Falha no refresh: ${resultadoRefresh.message}`,
        dados: null,
      };
    }
    console.log(`[Integracao ${integracao.id}] Refresh concluido com sucesso`);

    return this.executaEtapaScrap(
      integracao,
      resultadoRefresh.dados,
      controleLimite,
    );
  }

  private async executaEtapaContexto(
    integracao: Integracao,
    tipoRequisicao: Extract<TipoRequisicao, 'AUTH' | 'REFRESH'>,
    contexto: ContextoIntegracao,
    controleLimite: ControleLimiteRequisicao,
  ): Promise<ResultadoExecucao<ContextoIntegracao>> {
    const configuracao = this.obtemConfiguracaoEtapa(
      integracao,
      tipoRequisicao,
    );
    const resposta = await this.executaRequisicao(
      configuracao,
      contexto,
      tipoRequisicao,
      controleLimite,
    );
    console.log(
      `[Integracao ${integracao.id}] Resultado da etapa ${tipoRequisicao}: sucesso=${resposta.sucesso} status=${resposta.statusCode}`,
    );

    if (!resposta.sucesso || !resposta.dados) {
      return {
        sucesso: false,
        statusCode: resposta.statusCode,
        message: resposta.message,
        dados: null,
      };
    }

    const responseMap = this.parseResponseMap(configuracao.response);
    return {
      sucesso: true,
      statusCode: resposta.statusCode,
      message: resposta.message,
      dados: this.extraiVariaveisDaResposta(
        resposta.dados.data,
        responseMap,
        resposta.dados.contexto,
      ),
    };
  }

  private async executaEtapaScrap(
    integracao: Integracao,
    contexto: ContextoIntegracao,
    controleLimite: ControleLimiteRequisicao,
  ): Promise<ResultadoExecucao<DadosCliente[]>> {
    const configuracao = this.obtemConfiguracaoEtapa(integracao, 'SCRAP');
    const resposta = await this.executaRequisicao(
      configuracao,
      contexto,
      'SCRAP',
      controleLimite,
    );
    console.log(
      `[Integracao ${integracao.id}] Resposta bruta do SCRAP: sucesso=${resposta.sucesso} status=${resposta.statusCode}`,
    );

    if (!resposta.sucesso || !resposta.dados) {
      return {
        sucesso: false,
        statusCode: resposta.statusCode,
        message: resposta.message,
        dados: null,
      };
    }

    const responseMap = this.parseResponseMap(configuracao.response);
    return {
      sucesso: true,
      statusCode: resposta.statusCode,
      message: resposta.message,
      dados: this.extraiDadosDaResposta(resposta.dados.data, responseMap),
    };
  }

  private obtemConfiguracaoEtapa(
    integracao: Integracao,
    tipoRequisicao: TipoRequisicao,
  ): ConfiguracaoEtapa {
    if (tipoRequisicao === 'AUTH') {
      return {
        url: integracao.urlAuth,
        headers: integracao.headersAuth,
        metodo: integracao.metodoAuth,
        variaveis: integracao.variaveisAuth,
        response: integracao.responseAuth,
        body: integracao.bodyAuth,
      };
    }

    if (tipoRequisicao === 'REFRESH') {
      return {
        url: integracao.urlRefresh,
        headers: integracao.headersRefresh,
        metodo: integracao.metodoRefresh,
        variaveis: integracao.variaveisRefresh,
        response: integracao.responseRefresh,
        body: integracao.bodyRefresh,
      };
    }

    return {
      url: integracao.urlScrap,
      headers: integracao.headersScrap,
      metodo: integracao.metodoScrap,
      variaveis: integracao.variaveisScrap,
      response: integracao.responseScrap,
      body: integracao.bodyScrap,
    };
  }

  private async persisteClientesEmLote(
    baseDeDadosId: number,
    estruturaDaBase: {
      cabecalho: string;
      tipo: TipoCampo;
      obrigatorio: boolean;
      rotulo: null;
    }[],
    dadosClientes: DadosCliente[],
    identificadoresDaBase: string[],
  ): Promise<void> {
    if (dadosClientes.length === 0) return;
    console.log(
      `[Base ${baseDeDadosId}] Iniciando persistencia em lote de ${dadosClientes.length} clientes`,
    );

    const resultado = await this.prismaService.$transaction((prisma) =>
      this.basesDadosService.salvaClientesDaBase(
        prisma,
        baseDeDadosId,
        estruturaDaBase,
        dadosClientes,
        identificadoresDaBase,
      ),
    );
    console.log(`[Base ${baseDeDadosId}] Persistencia em lote finalizada`);
    console.log(
      `[Base ${baseDeDadosId}] Resultado da persistencia: criados=${resultado.criados} atualizados=${resultado.atualizados}`,
    );
  }

  private substituiVariaveisEmTexto(
    texto: string,
    variaveis: unknown[],
    body?: boolean,
  ) {
    return texto.replace(regexChavesVariaveis, (_, nomeVariavel: string) => {
      const variavel = variaveis
        .map((item) => plainToInstance(IntegracaoVariavelDto, item))
        .find((item) => item.nome === nomeVariavel.trim());

      if (!variavel) {
        throw new BadRequestException(
          `Variavel "${nomeVariavel.trim()}" nao encontrada`,
        );
      }

      if (body) {
        if (variavel.tipo === TipoCampo.BOOLEANO) return variavel.valor;
        if (variavel.tipo === TipoCampo.NUMERO) return variavel.valor;
        return `"${variavel.valor}"`;
      }

      return variavel.valor;
    });
  }

  private montaHeaderComVariaveis(headers: unknown[], variaveis: unknown[]) {
    return headers.map((header) => {
      const headerPlain = plainToInstance(IntegracaoHeaderDto, header);

      return typeof headerPlain.valor === 'string'
        ? {
            ...headerPlain,
            valor: this.substituiVariaveisEmTexto(headerPlain.valor, variaveis),
          }
        : headerPlain;
    });
  }

  private parseJsonField<T>(value: unknown, fallback: T): T {
    if (value === null || value === undefined) return fallback;
    return typeof value === 'string' ? (JSON.parse(value) as T) : (value as T);
  }

  private async realizaRequest(
    metodo: METODO,
    url: string,
    headersDto: IntegracaoHeaderDto[],
    body: string | null,
  ) {
    return await firstValueFrom(
      this.httpService.request({
        method: metodo,
        url,
        headers: Object.fromEntries(
          headersDto.map((header) => [header.chave, header.valor]),
        ),
        data: body,
        validateStatus: () => true,
      }),
    );
  }

  private async executaRequisicao(
    configuracao: ConfiguracaoEtapa,
    contexto: ContextoIntegracao,
    tipoRequisicao: TipoRequisicao,
    controleLimite: ControleLimiteRequisicao,
  ): Promise<ResultadoExecucao<RespostaEtapa>> {
    if (!configuracao.url) {
      return {
        sucesso: false,
        statusCode: 0,
        message: `URL ${tipoRequisicao} da requisicao nao configurada`,
        dados: null,
      };
    }

    if (!configuracao.metodo) {
      return {
        sucesso: false,
        statusCode: 0,
        message: `Metodo ${tipoRequisicao} nao configurado`,
        dados: null,
      };
    }

    console.log(
      `[Execucao ${tipoRequisicao}] Preparando requisicao para ${configuracao.url}`,
    );
    const variaveisBase = this.parseJsonField<unknown[]>(
      configuracao.variaveis,
      [],
    );
    const contextoAtual = this.mergeVariaveisContexto(variaveisBase, contexto);
    const urlMontada = this.substituiVariaveisEmTexto(
      configuracao.url,
      contextoAtual,
    );
    const metodo = configuracao.metodo as METODO;

    const headersMontados = configuracao.headers
      ? this.montaHeaderComVariaveis(
          this.parseJsonField<unknown[]>(configuracao.headers, []),
          contextoAtual,
        )
      : [];

    let bodyMontado = configuracao.body;
    if (metodo !== METODO.GET && bodyMontado) {
      bodyMontado = JSON.parse(
        this.substituiVariaveisEmTexto(bodyMontado, contextoAtual, true),
      ) as string;
    }

    await this.aplicaLimiteDeRequisicao(controleLimite);
    const resposta = await this.realizaRequest(
      metodo,
      urlMontada,
      headersMontados,
      bodyMontado,
    );
    console.log(
      `[Execucao ${tipoRequisicao}] Requisicao concluida com status ${resposta.status}`,
    );

    const sucesso = this.isStatusSucesso(resposta.status);

    return {
      sucesso,
      statusCode: resposta.status,
      message: sucesso
        ? `Requisicao ${tipoRequisicao} executada com sucesso`
        : `A requisicao ${tipoRequisicao} retornou statusCode ${resposta.status}`,
      dados: {
        data: resposta.data as unknown,
        statusCode: resposta.status,
        contexto: contextoAtual,
      },
    };
  }

  private criaControleLimiteRequisicao(
    limitePorMinuto: number,
  ): ControleLimiteRequisicao {
    return {
      inicioJanela: null,
      requisicoesNaJanela: 0,
      limitePorMinuto: Math.max(1, limitePorMinuto),
    };
  }

  private async aplicaLimiteDeRequisicao(
    controle: ControleLimiteRequisicao,
  ): Promise<void> {
    const agora = Date.now();
    const duracaoJanelaMs = 60_000;
    const folgaReinicioMs = 1_000;

    if (
      controle.inicioJanela === null ||
      agora > controle.inicioJanela + duracaoJanelaMs
    ) {
      controle.inicioJanela = agora;
      controle.requisicoesNaJanela = 0;
    }

    if (controle.requisicoesNaJanela >= controle.limitePorMinuto) {
      const esperaMs =
        controle.inicioJanela + duracaoJanelaMs + folgaReinicioMs - agora;

      if (esperaMs > 0) {
        console.log(
          `[LimiteRequisicao] Limite de ${controle.limitePorMinuto}/min atingido. Aguardando ${esperaMs}ms para reiniciar janela`,
        );
        await this.aguarda(esperaMs);
      }

      controle.inicioJanela = Date.now();
      controle.requisicoesNaJanela = 0;
    }

    controle.requisicoesNaJanela += 1;
  }

  private async aguarda(tempoMs: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, tempoMs));
  }

  private parseResponseMap(response: unknown): IntegracaoResponseDto[] {
    return this.parseJsonField<unknown[]>(response, []).map((responseItem) =>
      plainToInstance(IntegracaoResponseDto, responseItem),
    );
  }

  private extraiVariaveisDaResposta(
    data: unknown,
    responseMap: IntegracaoResponseDto[],
    contexto: ContextoIntegracao,
  ): ContextoIntegracao {
    const variaveisDaResposta = responseMap.map((responseItem) => ({
      nome: responseItem.nome,
      valor: this.obtemValorTexto(data, responseItem.path),
      tipo: responseItem.tipo,
    }));

    return this.mergeVariaveisContexto(contexto, variaveisDaResposta);
  }

  private obtemValorTexto(data: unknown, path: string): string {
    const valor = lodash.get(data, path) as unknown;

    if (typeof valor === 'string') return valor;

    if (
      typeof valor === 'number' ||
      typeof valor === 'boolean' ||
      typeof valor === 'bigint'
    ) {
      return String(valor);
    }

    return JSON.stringify(valor);
  }

  private isStatusSucesso(status: number): boolean {
    return status >= 200 && status < 300;
  }

  private isErroHttpCliente(status: number): boolean {
    return status >= 400 && status < 500;
  }

  private lancaFalhaExecucao(
    integracaoId: number,
    resultado: ResultadoExecucao<unknown>,
  ): never {
    console.log(
      `[Integracao ${integracaoId}] Execucao falhou: ${resultado.message}`,
    );

    throw new BadRequestException({
      message: resultado.message,
      statusCode: resultado.statusCode,
    });
  }

  private extraiDadosDaResposta(
    data: unknown,
    responseMap: IntegracaoResponseDto[],
  ): DadosCliente[] {
    const totalLinhas = this.obtemTotalLinhasResposta(data, responseMap);
    const dados = Array.from(
      { length: totalLinhas },
      () => ({}) as Record<string, unknown>,
    );

    for (let indice = 0; indice < totalLinhas; indice++) {
      for (const responseItem of responseMap) {
        dados[indice][responseItem.nome] = this.obtemValorPathResposta(
          data,
          responseItem.path,
          indice,
        );
      }
    }

    return dados;
  }

  private obtemTotalLinhasResposta(
    data: unknown,
    responseMap: IntegracaoResponseDto[],
  ): number {
    const pathsDinamicos = responseMap
      .map((item) => item.path)
      .filter((path) => path.includes('[n]'));

    if (pathsDinamicos.length === 0) return 1;

    return pathsDinamicos.reduce((maiorTotal, path) => {
      const caminhoArray = path.split('[n]')[0]?.replace(/\.$/, '') ?? '';
      const valor: unknown = caminhoArray
        ? (lodash.get(data, caminhoArray) as unknown)
        : data;

      if (!Array.isArray(valor)) {
        return maiorTotal;
      }

      return Math.max(maiorTotal, valor.length);
    }, 0);
  }

  private obtemValorPathResposta(
    data: unknown,
    path: string,
    indice: number,
  ): unknown {
    const pathResolvido = path.includes('[n]')
      ? path.replaceAll('[n]', `[${indice}]`)
      : path;

    return lodash.get(data, pathResolvido) as unknown;
  }

  private montaEstruturaDaIntegracao(responseScrap: unknown) {
    const responseMap = this.parseResponseMap(responseScrap);

    return responseMap.map((item) => ({
      cabecalho: item.nome,
      tipo: item.tipo,
      obrigatorio: false,
      rotulo: null,
    }));
  }

  private obtemIdentificadoresDaIntegracao(responseScrap: unknown) {
    const responseMap = this.parseResponseMap(responseScrap);

    return responseMap
      .filter((item) => item.identificador)
      .map((item) => item.nome);
  }

  private mergeVariaveisContexto(
    variaveisBase: unknown[],
    variaveisRecolhidas: ContextoIntegracao,
  ): ContextoIntegracao {
    const variaveisNormalizadas = variaveisBase.map((variavel) =>
      plainToInstance(IntegracaoVariavelDto, variavel),
    );

    return [
      ...variaveisNormalizadas.filter((variavelBase) => {
        const jaExiste = variaveisRecolhidas.some(
          (variavelRecolhida) => variavelRecolhida.nome === variavelBase.nome,
        );

        return !jaExiste;
      }),
      ...variaveisRecolhidas,
    ];
  }

  private encontraVariavelDelimitadora(
    variaveisRaw: unknown,
  ): IntegracaoVariavelDto | undefined {
    const variaveis = this.parseJsonField<unknown[]>(variaveisRaw, []).map(
      (variavel) => plainToInstance(IntegracaoVariavelDto, variavel),
    );

    return variaveis.find(
      (variavel) => variavel.incremento?.delimitador || false,
    );
  }

  private obtemIncrementoVariavel(
    variavel?: IntegracaoVariavelDto,
  ): IntegracaoVariavelIncrementoDto | null {
    if (!variavel?.incremento) return null;

    return plainToInstance(
      IntegracaoVariavelIncrementoDto,
      variavel.incremento,
    );
  }

  private obtemTotalIteracoes(
    incremento: IntegracaoVariavelIncrementoDto | null,
  ): number {
    if (!incremento) return 1;
    if (
      incremento.limiteIncrementa !== null &&
      incremento.limiteIncrementa !== undefined
    ) {
      return incremento.limiteIncrementa;
    }

    if (incremento.limiteDataAtual) {
      return Number.MAX_SAFE_INTEGER;
    }

    return 1;
  }

  private obtemValorVariavel(contexto: ContextoIntegracao, nome: string) {
    const variavel = contexto.find((item) => item.nome === nome);

    if (!variavel) {
      throw new BadRequestException(
        `Variavel delimitadora "${nome}" nao encontrada`,
      );
    }

    return variavel.valor;
  }

  private incrementaVariavelDelimitadora(
    contexto: ContextoIntegracao,
    nome: string,
    tipo: TipoCampo,
    valorAtual: string,
    limitaDataAtual: boolean,
  ) {
    let deveContinuar = true;

    const novoContexto = contexto.map((variavel) => {
      if (variavel.nome !== nome) return variavel;

      if (tipo === TipoCampo.NUMERO) {
        const atual = Number(valorAtual);
        if (Number.isNaN(atual)) {
          throw new BadRequestException(
            `Variavel delimitadora "${nome}" precisa ser numerica`,
          );
        }

        return {
          ...variavel,
          valor: String(atual + 1),
        };
      }

      const proximoValor = incrementaData(valorAtual, tipo);
      if (proximoValor === valorAtual) {
        throw new BadRequestException(
          `Variavel delimitadora "${nome}" precisa estar no formato DD/MM/YYYY`,
        );
      }

      if (limitaDataAtual && dataDDMMYYYYMaiorQueHoje(proximoValor, tipo)) {
        deveContinuar = false;
        return variavel;
      }

      return {
        ...variavel,
        valor: proximoValor,
      };
    });

    return {
      contexto: novoContexto,
      deveContinuar,
    };
  }
}
