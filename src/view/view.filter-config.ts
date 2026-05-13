import { PrismaFilterFieldConfig } from 'src/common/interfaces/prisma-filter-config.interface';

export const viewFilterConfig: Record<string, PrismaFilterFieldConfig> = {
  id: { type: 'number' },
  nome: { type: 'string' },
};

export const viewOrderByFields = ['id', 'nome', 'createdAt', 'updatedAt'];
