import { PrismaFilterFieldConfig } from 'src/common/interfaces/prisma-filter-config.interface';

export const integracoesFilterConfig: Record<string, PrismaFilterFieldConfig> =
  {
    id: { type: 'number' },
    nome: { type: 'string' },
    usuarioId: { type: 'number' },
  };

export const integracoesOrderByFields = [
  'id',
  'nome',
  'usuarioId',
  'createdAt',
  'updatedAt',
];
