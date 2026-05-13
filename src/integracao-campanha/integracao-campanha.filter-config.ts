import { PrismaFilterFieldConfig } from '../common/interfaces/prisma-filter-config.interface';

export const integracaoCampanhaFilterConfig: Record<
  string,
  PrismaFilterFieldConfig
> = {
  id: { type: 'number' },
  status: { type: 'boolean' },
  nome: { type: 'string' },
  provedor: { type: 'string' },
};

export const integracaoCampanhaOrderByFields = [
  'id',
  'nome',
  'provedor',
  'status',
  'createdAt',
  'updatedAt',
];
