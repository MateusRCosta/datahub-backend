import { BadRequestException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { Integracao } from '@prisma/client';
import { of } from 'rxjs';
import { BaseDadosService } from 'src/base-dados/base-dados.service';
import { TipoCampo } from 'src/common/types/dados.types';
import { PrismaService } from 'src/config/prisma.service';
import { IntegracaoExecucaoService } from './integracao-execucao.service';
import { METODO } from './types/integracao.type';

type PrismaTransactionMock = Record<string, never>;

type PrismaServiceMock = {
  $transaction: jest.Mock;
};

type HttpServiceMock = {
  request: jest.Mock;
};

type BaseDadosServiceMock = {
  garanteBaseDaIntegracao: jest.Mock;
  salvaClientesDaBase: jest.Mock;
};

describe('IntegracaoExecucaoService', () => {
  let service: IntegracaoExecucaoService;
  let prisma: PrismaTransactionMock;
  let prismaService: PrismaServiceMock;
  let httpService: HttpServiceMock;
  let baseDadosService: BaseDadosServiceMock;
  let consoleLogSpy: jest.SpyInstance;

  beforeEach(() => {
    prisma = {};
    prismaService = {
      $transaction: jest.fn(
        (callback: (tx: PrismaTransactionMock) => Promise<unknown>) =>
          callback(prisma),
      ),
    };
    httpService = {
      request: jest.fn(),
    };
    baseDadosService = {
      garanteBaseDaIntegracao: jest.fn().mockResolvedValue(100),
      salvaClientesDaBase: jest
        .fn()
        .mockResolvedValue({ criados: 1, atualizados: 0 }),
    };
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

    service = new IntegracaoExecucaoService(
      prismaService as unknown as PrismaService,
      httpService as unknown as HttpService,
      baseDadosService as unknown as BaseDadosService,
    );
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    jest.clearAllMocks();
  });

  it('ativa executa integracao', async () => {
    const executaSpy = jest.spyOn(service, 'executa').mockResolvedValue({
      sucesso: true,
      statusCode: 200,
      message: 'ok',
      dados: undefined,
    });
    const integracao = buildIntegracao();

    await expect(service.ativa(integracao, 99)).resolves.toBeUndefined();

    expect(executaSpy).toHaveBeenCalledWith(integracao);
  });

  it('executa SCRAP com sucesso e persiste clientes em lote', async () => {
    const integracao = buildIntegracao();
    httpService.request.mockReturnValue(
      of({
        status: 200,
        data: [{ email: 'joao@example.com', nome: 'Joao' }],
      }),
    );

    await expect(service.executa(integracao)).resolves.toEqual({
      sucesso: true,
      statusCode: 200,
      message: 'Integracao executada com sucesso',
      dados: undefined,
    });

    expect(baseDadosService.garanteBaseDaIntegracao).toHaveBeenCalledWith(
      prisma,
      integracao.id,
      integracao.nome,
      integracao.responseScrap,
    );
    expect(httpService.request).toHaveBeenCalledTimes(1);
    const [requestArgs] = httpService.request.mock.calls[0] as [
      {
        method: METODO;
        url: string;
        headers: Record<string, unknown>;
        data: string | null;
        validateStatus: (status: number) => boolean;
      },
    ];
    expect(requestArgs.method).toBe(METODO.GET);
    expect(requestArgs.url).toBe('https://api.example.com/clientes');
    expect(requestArgs.headers).toEqual({});
    expect(requestArgs.data).toBeNull();
    expect(requestArgs.validateStatus(500)).toBe(true);
    expect(baseDadosService.salvaClientesDaBase).toHaveBeenCalledWith(
      prisma,
      100,
      [
        {
          cabecalho: 'email',
          tipo: TipoCampo.EMAIL,
          obrigatorio: false,
          rotulo: null,
        },
        {
          cabecalho: 'nome',
          tipo: TipoCampo.TEXTO,
          obrigatorio: false,
          rotulo: null,
        },
      ],
      [{ email: 'joao@example.com', nome: 'Joao' }],
      ['email'],
    );
  });

  it('executa retorna BadRequestException quando SCRAP nao possui url', async () => {
    const integracao = buildIntegracao({ urlScrap: undefined });

    await expect(service.executa(integracao)).rejects.toThrow(
      BadRequestException,
    );

    expect(httpService.request).not.toHaveBeenCalled();
    expect(baseDadosService.salvaClientesDaBase).not.toHaveBeenCalled();
  });

  it('executa refresh quando SCRAP retorna erro cliente e repete coleta', async () => {
    const integracao = buildIntegracao({
      urlRefresh: 'https://api.example.com/refresh',
      metodoRefresh: METODO.POST,
      responseRefresh: [
        {
          nome: 'token',
          path: 'token',
          tipo: TipoCampo.TEXTO,
        },
      ],
      headersScrap: [
        {
          chave: 'Authorization',
          valor: 'Bearer {{token}}',
        },
      ],
      variaveisScrap: [
        {
          nome: 'token',
          valor: 'token-expirado',
          tipo: TipoCampo.TEXTO,
        },
      ],
    });
    httpService.request
      .mockReturnValueOnce(
        of({
          status: 401,
          data: { message: 'expired' },
        }),
      )
      .mockReturnValueOnce(
        of({
          status: 200,
          data: { token: 'novo-token' },
        }),
      )
      .mockReturnValueOnce(
        of({
          status: 200,
          data: [{ email: 'joao@example.com', nome: 'Joao' }],
        }),
      );

    await expect(service.executa(integracao)).resolves.toEqual({
      sucesso: true,
      statusCode: 200,
      message: 'Integracao executada com sucesso',
      dados: undefined,
    });

    expect(httpService.request).toHaveBeenCalledTimes(3);
    const [thirdRequest] = httpService.request.mock.calls[2] as [
      {
        headers: {
          Authorization: string;
        };
      },
    ];
    expect(thirdRequest.headers.Authorization).toBe('Bearer novo-token');
  });
});

function buildIntegracao(overrides: Partial<Integracao> = {}): Integracao {
  return {
    id: 1,
    nome: 'Scrapping clientes',
    status: true,
    limitDeRequisicaoPorMin: 10,
    horaExecucao: 4,
    urlAuth: null,
    metodoAuth: null,
    headersAuth: [],
    bodyAuth: null,
    responseAuth: [],
    variaveisAuth: [],
    urlRefresh: null,
    metodoRefresh: null,
    headersRefresh: [],
    bodyRefresh: null,
    responseRefresh: [],
    variaveisRefresh: [],
    urlScrap: 'https://api.example.com/clientes',
    metodoScrap: METODO.GET,
    headersScrap: [],
    bodyScrap: null,
    responseScrap: [
      {
        nome: 'email',
        path: '[n].email',
        tipo: TipoCampo.EMAIL,
        identificador: true,
      },
      {
        nome: 'nome',
        path: '[n].nome',
        tipo: TipoCampo.TEXTO,
      },
    ],
    variaveisScrap: [],
    usuarioId: 99,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    deletedAt: null,
    ...overrides,
  } as Integracao;
}
