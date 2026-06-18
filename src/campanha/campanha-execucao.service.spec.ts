import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TipoCampo } from 'src/common/types/dados.types';
import { BaseDadosService } from 'src/base-dados/base-dados.service';
import { ClientesService } from 'src/cliente/cliente.service';
import { PrismaService } from 'src/config/prisma.service';
import { IntegracaoCampanhaService } from 'src/integracao-campanha/integracao-campanha.service';
import { PROVEDOR_INTEGRACAO_CAMPANHA } from 'src/integracao-campanha/types/provedor-integracao-campanha.type';
import { QueryView } from 'src/view/types/view.types';
import { ViewService } from 'src/view/view.service';
import { CampanhaExecucaoService } from './campanha-execucao.service';
import { ClienteCampanhaService } from './cliente-campanha.service';
import { STATUS_CAMPANHA } from './types/campanha.type';
import { STATUS_CLIENTE_CAMPANHA } from './types/cliente-campanha.type';

type CampanhaDelegateMock = {
  findFirst: jest.Mock;
  updateMany: jest.Mock;
};

type PrismaServiceMock = {
  campanha: CampanhaDelegateMock;
};

type BaseDadosServiceMock = {
  retornaEstruturaPorId: jest.Mock;
};

type IntegracaoCampanhaServiceMock = {
  executa: jest.Mock;
};

type ViewServiceMock = {
  executeComClienteId: jest.Mock;
  executePorClienteIds: jest.Mock;
  buscaConfigPorId: jest.Mock;
};

type ClientesServiceMock = {
  buscaIdsPorBase: jest.Mock;
};

type ClienteCampanhaServiceMock = {
  criaClientesCampanha: jest.Mock;
  buscaClientesPendentes: jest.Mock;
  atualizaStatusClientes: jest.Mock;
  contaPendentesOuEmEnvio: jest.Mock;
};

describe('CampanhaExecucaoService', () => {
  let service: CampanhaExecucaoService;
  let prismaService: PrismaServiceMock;
  let baseDadosService: BaseDadosServiceMock;
  let integracaoCampanhaService: IntegracaoCampanhaServiceMock;
  let viewService: ViewServiceMock;
  let clientesService: ClientesServiceMock;
  let clienteCampanhaService: ClienteCampanhaServiceMock;
  let consoleLogSpy: jest.SpyInstance;

  const estrutura = [
    {
      cabecalho: 'telefone',
      rotulo: 'Telefone',
      tipo: TipoCampo.TEXTO,
      obrigatorio: true,
    },
    {
      cabecalho: 'nome',
      rotulo: 'Nome',
      tipo: TipoCampo.TEXTO,
      obrigatorio: true,
    },
  ];

  const queryView: QueryView = {
    from: { baseDadosId: 10 },
    select: [
      {
        baseDadosId: 10,
        joinIndex: 0,
        campos: [
          { campo: 'telefone', rotulo: 'Telefone' },
          { campo: 'nome', rotulo: 'Nome' },
        ],
      },
    ],
  };

  const campanhaExecucao = {
    id: 1,
    nome: 'Campanha clientes',
    status: STATUS_CAMPANHA.EM_ENVIO,
    vars: [{ variavel: 'nomeCliente', valor: '#nome' }],
    contatoCampo: { valor: 'telefone' },
    viewId: null,
    baseDeDadosId: 10,
    template: {
      id: 1,
      config: {
        id: 1,
        tituloTemplate: 'Template',
        mensagemTemplate: 'Ola {{nomeCliente}}',
        rodapeTemplate: '',
        botoes: [],
      },
      integracaoCampanha: {
        provedor: PROVEDOR_INTEGRACAO_CAMPANHA.UPCHAT,
        config: {
          url: 'https://api.example.com',
          queueId: 1,
          apiKey: 'api-key',
        },
      },
    },
  };

  beforeEach(() => {
    prismaService = {
      campanha: {
        findFirst: jest.fn(),
        updateMany: jest.fn(),
      },
    };
    baseDadosService = {
      retornaEstruturaPorId: jest.fn().mockResolvedValue({ estrutura }),
    };
    integracaoCampanhaService = {
      executa: jest.fn().mockResolvedValue(undefined),
    };
    viewService = {
      executeComClienteId: jest.fn(),
      executePorClienteIds: jest.fn(),
      buscaConfigPorId: jest.fn().mockResolvedValue(queryView),
    };
    clientesService = {
      buscaIdsPorBase: jest.fn(),
    };
    clienteCampanhaService = {
      criaClientesCampanha: jest.fn().mockResolvedValue(undefined),
      buscaClientesPendentes: jest.fn(),
      atualizaStatusClientes: jest.fn().mockResolvedValue(undefined),
      contaPendentesOuEmEnvio: jest.fn().mockResolvedValue(0),
    };
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {
      return undefined;
    });

    service = new CampanhaExecucaoService(
      prismaService as unknown as PrismaService,
      baseDadosService as unknown as BaseDadosService,
      integracaoCampanhaService as unknown as IntegracaoCampanhaService,
      viewService as unknown as ViewService,
      clientesService as unknown as ClientesService,
      clienteCampanhaService as unknown as ClienteCampanhaService,
    );
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    jest.clearAllMocks();
  });

  it('executa campanha pela base de dados e finaliza sem pendentes', async () => {
    prismaService.campanha.findFirst
      .mockResolvedValueOnce({ id: 1, viewId: null, baseDeDadosId: 10 })
      .mockResolvedValueOnce(campanhaExecucao)
      .mockResolvedValueOnce(campanhaExecucao);
    clientesService.buscaIdsPorBase
      .mockResolvedValueOnce([{ id: 10 }, { id: 20 }])
      .mockResolvedValueOnce([]);
    clienteCampanhaService.buscaClientesPendentes
      .mockResolvedValueOnce([
        {
          id: 100,
          cliente: {
            id: 10,
            dados: { telefone: '11999999999', nome: 'Joao' },
          },
        },
      ])
      .mockResolvedValueOnce([]);
    prismaService.campanha.updateMany.mockResolvedValue({ count: 1 });

    await expect(service.executaCampanha(1)).resolves.toBeUndefined();

    expect(clientesService.buscaIdsPorBase).toHaveBeenCalledWith(10, 0, 500);
    expect(clienteCampanhaService.criaClientesCampanha).toHaveBeenCalledWith(
      1,
      [10, 20],
    );
    expect(integracaoCampanhaService.executa).toHaveBeenCalledTimes(1);
    const [execucaoArgs] = integracaoCampanhaService.executa.mock.calls[0] as [
      {
        provedor: PROVEDOR_INTEGRACAO_CAMPANHA.UPCHAT;
        clientes: {
          meio: string;
          parametros: { variavel: string; valor: string }[];
        }[];
        nomeCampanha: string;
      },
    ];
    expect(execucaoArgs.provedor).toBe(PROVEDOR_INTEGRACAO_CAMPANHA.UPCHAT);
    expect(execucaoArgs.nomeCampanha).toBe('Campanha clientes');
    expect(execucaoArgs.clientes).toEqual([
      {
        meio: '11999999999',
        parametros: [{ variavel: 'nomeCliente', valor: 'Joao' }],
      },
    ]);
    expect(clienteCampanhaService.atualizaStatusClientes).toHaveBeenCalledWith(
      [100],
      STATUS_CLIENTE_CAMPANHA.EM_ENVIO,
    );
    expect(clienteCampanhaService.atualizaStatusClientes).toHaveBeenCalledWith(
      [100],
      STATUS_CLIENTE_CAMPANHA.ENVIADO,
    );
    const [finalizaArgs] = prismaService.campanha.updateMany.mock.calls[0] as [
      {
        where: { id: number; deletedAt: null; status: STATUS_CAMPANHA };
        data: {
          status: STATUS_CAMPANHA;
          updatedAt: Date;
          finishedAt: Date;
        };
      },
    ];
    expect(finalizaArgs.where).toEqual({
      id: 1,
      deletedAt: null,
      status: STATUS_CAMPANHA.EM_ENVIO,
    });
    expect(finalizaArgs.data.status).toBe(STATUS_CAMPANHA.ENVIADA);
    expect(finalizaArgs.data.updatedAt).toBeInstanceOf(Date);
    expect(finalizaArgs.data.finishedAt).toBeInstanceOf(Date);
  });

  it('popula clientes pela view e interrompe quando status esta pausado', async () => {
    prismaService.campanha.findFirst
      .mockResolvedValueOnce({ id: 1, viewId: 20, baseDeDadosId: null })
      .mockResolvedValueOnce({
        ...campanhaExecucao,
        status: STATUS_CAMPANHA.PAUSA,
        viewId: 20,
        baseDeDadosId: null,
      });
    viewService.executeComClienteId.mockResolvedValue({
      data: [
        { _clienteId: 10, Email: 'joao@example.com' },
        { _clienteId: 10, Email: 'joao@example.com' },
        { _clienteId: 20, Email: 'maria@example.com' },
      ],
      meta: {
        page: 1,
        limit: 500,
        total: 3,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    });

    await expect(service.executaCampanha(1)).resolves.toBeUndefined();

    expect(viewService.executeComClienteId).toHaveBeenCalledWith(20, {
      page: 1,
      limit: 500,
    });
    expect(clienteCampanhaService.criaClientesCampanha).toHaveBeenCalledWith(
      1,
      [10, 20],
    );
    expect(
      clienteCampanhaService.buscaClientesPendentes,
    ).not.toHaveBeenCalled();
  });

  it('executaCampanha retorna NotFoundException quando campanha nao existe', async () => {
    prismaService.campanha.findFirst.mockResolvedValue(null);

    await expect(service.executaCampanha(1)).rejects.toThrow(NotFoundException);
  });

  it('executaCampanha retorna BadRequestException quando nao possui fonte', async () => {
    prismaService.campanha.findFirst.mockResolvedValue({
      id: 1,
      viewId: null,
      baseDeDadosId: null,
    });

    await expect(service.executaCampanha(1)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('montaConsultador retorna valores da base', () => {
    const consultador = service.montaConsultador({
      dados: {
        nome: 'Joao',
        ativo: true,
        idade: 30,
      },
    });

    expect(consultador('nome')).toBe('Joao');
    expect(consultador('ativo')).toBe(true);
    expect(consultador('idade')).toBe(30);
  });

  it('montaConsultador retorna valores da view pelo alias', () => {
    const consultador = service.montaConsultador({
      query: queryView,
      row: {
        _clienteId: 10,
        'b0-Email': 'joao@example.com',
        'b0-Nome': 'Joao',
      },
    });

    expect(consultador('nome')).toBe('Joao');
    expect(consultador('Nome', 10)).toBe('Joao');
    expect(consultador('telefone', 10)).toBeUndefined();
  });

  it('montaConsultador retorna BadRequestException sem dados ou query', () => {
    expect(() => service.montaConsultador({})).toThrow(BadRequestException);
  });
});
