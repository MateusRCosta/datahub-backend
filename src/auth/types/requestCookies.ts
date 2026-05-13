import { Payload } from './payload';

export type RequestCookies = {
  headers: {
    cookie?: string;
    'user-agent'?: string;
  };
  ip?: string;
  cookies?: Record<string, string>;
  user?: Payload;
};
