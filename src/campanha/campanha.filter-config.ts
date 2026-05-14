import { PrismaFilterFieldConfig } from 'src/common/interfaces/prisma-filter-config.interface';

export const campanhaFilterConfig: Record<string, PrismaFilterFieldConfig> = {
  id: { type: 'number' },
  nome: { type: 'string' },
  templateId: { type: 'number' },
  viewId: { type: 'number' },
  baseDeDadoId: { type: 'number' },
};

export const campanhaOrderByFields = [
  'id',
  'nome',
  'status',
  'scheduledAt',
  'executedAt',
  'finishedAt',
  'createdAt',
  'updatedAt',
];
