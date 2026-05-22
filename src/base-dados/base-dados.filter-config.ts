import { PrismaFilterFieldConfig } from '../common/interfaces/prisma-filter-config.interface';

export const baseDadosFilterConfig: Record<string, PrismaFilterFieldConfig> = {
  id: { type: 'number' },
  nome: { type: 'string' },
  usuarioId: { type: 'number' },
  integracaoId: { type: 'number' },
};

export const baseDadosOrderByFields = ['id', 'nome', 'createdAt', 'updatedAt'];
