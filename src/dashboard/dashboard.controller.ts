import { Controller, Get } from '@nestjs/common';
import { Authenticated } from 'src/auth/decorators/permissoes';
import { UsuarioAtual } from 'src/auth/decorators/usuario-atual.decorator';
import type { Payload } from 'src/auth/types/payload';
import { DashboardService } from './dashboard.service';
import type { DashboardResponse } from './types/dashboard.types';

@Controller('dashboard')
@Authenticated()
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  retornaResumo(@UsuarioAtual() usuario: Payload): Promise<DashboardResponse> {
    return this.dashboardService.retornaResumo(usuario);
  }
}
