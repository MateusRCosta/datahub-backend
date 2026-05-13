import { PrismaFilterFieldConfig } from 'src/common/interfaces/prisma-filter-config.interface';

export const clientesFilterConfig: Record<string, PrismaFilterFieldConfig> = {
  id: { type: 'number' },
  baseDeDadosId: { type: 'number' },
  hash: { type: 'string' },
};

export const clientesOrderByFields = [
  'id',
  'baseDeDadosId',
  'hash',
  'createdAt',
  'updatedAt',
];
