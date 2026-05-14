import { PrismaFilterFieldConfig } from 'src/common/interfaces/prisma-filter-config.interface';

export const templateFilterConfig: Record<string, PrismaFilterFieldConfig> = {
  id: { type: 'number' },
  nome: { type: 'string' },
  provedor: { type: 'string' },
  integracaoCampanhaId: { type: 'number' },
};

export const templateOrderByFields = [
  'id',
  'nome',
  'provedor',
  'integracaoCampanhaId',
  'createdAt',
  'updatedAt',
];
