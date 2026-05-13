import { Permissao } from 'src/usuario/interfaces/permissao';

export type Payload = {
  sub: number; // usuario id
  admin: boolean;
  permissoes: Permissao[];
  sid: string;
  iat: number;
  exp: number;
};

export type PayloadRefreshToken = Pick<Payload, 'sub' | 'iat' | 'exp' | 'sid'>;

export type SessionMetadata = {
  ip?: string;
  userAgent?: string;
};
