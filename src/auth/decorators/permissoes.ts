import { SetMetadata } from '@nestjs/common';
import { Permissao } from 'src/usuario/interfaces/permissao';

export const PERMISSOES_KEY = 'permissoes';
export const AUTHENTICATED_KEY = 'authenticated';
export const ADMIN_ONLY_KEY = 'admin-only';

export const Roles = (...permissoes: Permissao[]) =>
  SetMetadata(PERMISSOES_KEY, permissoes);

export const Authenticated = () => SetMetadata(AUTHENTICATED_KEY, true);

export const AdminOnly = () => SetMetadata(ADMIN_ONLY_KEY, true);
