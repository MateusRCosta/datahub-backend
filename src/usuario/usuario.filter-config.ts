import { PrismaFilterFieldConfig } from 'src/common/interfaces/prisma-filter-config.interface';

export const usuariosFilterConfig: Record<string, PrismaFilterFieldConfig> = {
  id: { type: 'number' },
  nome: { type: 'string' },
  email: { type: 'string' },
  admin: { type: 'boolean' },
  ativo: { type: 'boolean' },
  permissoes: { type: 'json-array' },
};

export const usuariosOrderByFields = [
  'id',
  'nome',
  'email',
  'admin',
  'createdAt',
  'updatedAt',
];
