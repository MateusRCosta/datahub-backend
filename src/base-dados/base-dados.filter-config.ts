import { PrismaFilterFieldConfig } from '../common/interfaces/prisma-filter-config.interface';

export const basesDadosFilterConfig: Record<string, PrismaFilterFieldConfig> = {
  id: { type: 'number' },
  nome: { type: 'string' },
  usuarioId: { type: 'number' },
  integracaoId: { type: 'number' },
};

export const basesDadosOrderByFields = ['id', 'nome', 'createdAt', 'updatedAt'];
