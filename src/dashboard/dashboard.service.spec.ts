import { STATUS_CAMPANHA } from 'src/campanha/types/campanha.type';
import { PrismaService } from 'src/config/prisma.service';
import { STATUS_JOB } from 'src/integracao/types/integracao.type';
import { Permissao } from 'src/usuario/interfaces/permissao';
import { DashboardService } from './dashboard.service';

type DelegateMock = {
  count: jest.Mock;
  findMany: jest.Mock;
  groupBy: jest.Mock;
};

type PrismaServiceMock = {
  baseDeDados: DelegateMock;
  cliente: DelegateMock;
  view: DelegateMock;
  campanha: DelegateMock;
  integracao: DelegateMock;
  job: DelegateMock;
  usuario: DelegateMock;
};

function delegateMock(): DelegateMock {
  return {
    count: jest.fn().mockResolvedValue(0),
    findMany: jest.fn().mockResolvedValue([]),
    groupBy: jest.fn().mockResolvedValue([]),
  };
}

describe('DashboardService', () => {
  let service: DashboardService;
  let prisma: PrismaServiceMock;

  beforeEach(() => {
    prisma = {
      baseDeDados: delegateMock(),
      cliente: delegateMock(),
      view: delegateMock(),
      campanha: delegateMock(),
      integracao: delegateMock(),
      job: delegateMock(),
      usuario: delegateMock(),
    };
    service = new DashboardService(prisma as unknown as PrismaService);
  });

  it('retorna apenas dados permitidos e nao consulta outros dominios', async () => {
    prisma.baseDeDados.count.mockResolvedValue(3);
    prisma.cliente.count.mockResolvedValue(120);

    const result = await service.retornaResumo({
      admin: false,
      permissoes: [Permissao.GERENCIAR_BASE_DADOS],
    });

    expect(typeof result.generatedAt).toBe('string');
    expect(result).toEqual({
      generatedAt: result.generatedAt,
      basesDados: { totalBases: 3, totalClientes: 120 },
      alertas: [],
    });

    expect(prisma.baseDeDados.count).toHaveBeenCalledWith({
      where: { deletedAt: null },
    });
    expect(prisma.cliente.count).toHaveBeenCalledWith({
      where: { deletedAt: null, baseDeDados: { deletedAt: null } },
    });
    expect(prisma.view.count).not.toHaveBeenCalled();
    expect(prisma.campanha.groupBy).not.toHaveBeenCalled();
    expect(prisma.integracao.groupBy).not.toHaveBeenCalled();
    expect(prisma.usuario.groupBy).not.toHaveBeenCalled();
  });

  it('combina permissoes, preenche status e limita alertas', async () => {
    prisma.campanha.groupBy.mockResolvedValue([
      { status: STATUS_CAMPANHA.PENDENTE, _count: { _all: 2 } },
    ]);
    prisma.campanha.findMany.mockResolvedValue([
      {
        id: 10,
        nome: 'Campanha antiga',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: null,
        _count: { clienteCampanhas: 2 },
      },
      {
        id: 11,
        nome: 'Campanha recente',
        createdAt: new Date('2026-02-01T00:00:00.000Z'),
        updatedAt: null,
        _count: { clienteCampanhas: 1 },
      },
      {
        id: 12,
        nome: 'Campanha nova',
        createdAt: new Date('2026-03-01T00:00:00.000Z'),
        updatedAt: null,
        _count: { clienteCampanhas: 3 },
      },
    ]);
    prisma.integracao.groupBy.mockResolvedValue([
      { status: true, _count: { _all: 4 } },
    ]);
    prisma.job.groupBy.mockResolvedValue([
      { status: STATUS_JOB.ERRO, _count: { _all: 3 } },
    ]);
    prisma.job.findMany.mockResolvedValue([
      {
        id: 1,
        createdAt: new Date('2026-04-01T00:00:00.000Z'),
        finishedAt: null,
        integracao: { id: 21, nome: 'ERP' },
      },
      {
        id: 2,
        createdAt: new Date('2026-05-01T00:00:00.000Z'),
        finishedAt: null,
        integracao: { id: 22, nome: 'CRM' },
      },
      {
        id: 3,
        createdAt: new Date('2026-06-01T00:00:00.000Z'),
        finishedAt: null,
        integracao: { id: 23, nome: 'API' },
      },
    ]);

    const result = await service.retornaResumo({
      admin: false,
      permissoes: [
        Permissao.GERENCIAR_CAMPANHAS,
        Permissao.GERENCIAR_INTEGRACOES,
      ],
    });

    expect(result.campanhas?.totalPorStatus).toEqual({
      [STATUS_CAMPANHA.ENVIADA]: 0,
      [STATUS_CAMPANHA.EM_ENVIO]: 0,
      [STATUS_CAMPANHA.PAUSA]: 0,
      [STATUS_CAMPANHA.CANCELADA]: 0,
      [STATUS_CAMPANHA.PENDENTE]: 2,
    });
    expect(result.integracoes).toEqual({
      ativas: 4,
      inativas: 0,
      jobsPorStatus: {
        [STATUS_JOB.PENDENTE]: 0,
        [STATUS_JOB.RODANDO]: 0,
        [STATUS_JOB.COMPLETO]: 0,
        [STATUS_JOB.ERRO]: 3,
      },
    });
    expect(result.alertas).toHaveLength(5);
    expect(result.alertas.slice(0, 3).map((alerta) => alerta.tipo)).toEqual([
      'JOB_ERRO',
      'JOB_ERRO',
      'JOB_ERRO',
    ]);
    expect(result.alertas.slice(3).map((alerta) => alerta.tipo)).toEqual([
      'CAMPANHA_ENVIO_ERRO',
      'CAMPANHA_ENVIO_ERRO',
    ]);
    expect(result.alertas[3]?.titulo).toContain('3 envios com erro');
  });

  it('admin recebe todas as secoes', async () => {
    prisma.usuario.groupBy.mockResolvedValue([
      { ativo: true, _count: { _all: 5 } },
      { ativo: false, _count: { _all: 1 } },
    ]);

    const result = await service.retornaResumo({
      admin: true,
      permissoes: [],
    });

    expect(typeof result.generatedAt).toBe('string');
    expect(result).toEqual({
      generatedAt: result.generatedAt,
      basesDados: { totalBases: 0, totalClientes: 0 },
      visualizacoes: { total: 0 },
      campanhas: {
        totalPorStatus: {
          [STATUS_CAMPANHA.ENVIADA]: 0,
          [STATUS_CAMPANHA.EM_ENVIO]: 0,
          [STATUS_CAMPANHA.PAUSA]: 0,
          [STATUS_CAMPANHA.CANCELADA]: 0,
          [STATUS_CAMPANHA.PENDENTE]: 0,
        },
      },
      integracoes: {
        ativas: 0,
        inativas: 0,
        jobsPorStatus: {
          [STATUS_JOB.PENDENTE]: 0,
          [STATUS_JOB.RODANDO]: 0,
          [STATUS_JOB.COMPLETO]: 0,
          [STATUS_JOB.ERRO]: 0,
        },
      },
      usuarios: { ativos: 5, inativos: 1 },
      alertas: [],
    });
  });

  it('usuario sem permissao recebe dashboard vazio', async () => {
    const result = await service.retornaResumo({
      admin: false,
      permissoes: [],
    });

    expect(typeof result.generatedAt).toBe('string');
    expect(result).toEqual({
      generatedAt: result.generatedAt,
      alertas: [],
    });

    expect(prisma.baseDeDados.count).not.toHaveBeenCalled();
    expect(prisma.view.count).not.toHaveBeenCalled();
    expect(prisma.campanha.groupBy).not.toHaveBeenCalled();
    expect(prisma.integracao.groupBy).not.toHaveBeenCalled();
    expect(prisma.usuario.groupBy).not.toHaveBeenCalled();
  });
});
