import type { Payload } from 'src/auth/types/payload';
import { Permissao } from 'src/usuario/interfaces/permissao';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

type DashboardServiceMock = {
  retornaResumo: jest.Mock;
};

describe('DashboardController', () => {
  it('delega o usuario autenticado para o service', async () => {
    const dashboardService: DashboardServiceMock = {
      retornaResumo: jest.fn().mockResolvedValue({
        generatedAt: '2026-06-18T00:00:00.000Z',
        alertas: [],
      }),
    };
    const controller = new DashboardController(
      dashboardService as unknown as DashboardService,
    );
    const usuario = {
      sub: 1,
      admin: false,
      permissoes: [Permissao.GERENCIAR_BASE_DADOS],
      sid: 'session-id',
      iat: 1,
      exp: 2,
    } satisfies Payload;

    await expect(controller.retornaResumo(usuario)).resolves.toEqual({
      generatedAt: '2026-06-18T00:00:00.000Z',
      alertas: [],
    });
    expect(dashboardService.retornaResumo).toHaveBeenCalledWith(usuario);
  });
});
