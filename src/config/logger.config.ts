import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { Params } from 'nestjs-pino';

const isDevelopment = process.env.NODE_ENV === 'development';

const extractUserIdFromCookie = (
  cookieHeader: string | undefined,
): string | null => {
  if (!cookieHeader) return null;

  const cookies = Object.fromEntries(
    cookieHeader.split(';').map((c) => {
      const [key, ...val] = c.trim().split('=');
      return [key, val.join('=')];
    }),
  );
  const token = cookies['accessToken'] || cookies['refreshToken'];
  if (!token) return null;

  try {
    const payload = JSON.parse(
      Buffer.from(token.split('.')[1], 'base64url').toString(),
    );
    return payload['sub'] ?? null;
  } catch {
    return null;
  }
};

export const loggerConfig: Params = {
  pinoHttp: {
    level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
    genReqId: (request) =>
      request.headers['x-request-id']?.toString() || randomUUID(),
    customProps: (request, response) => {
      const req = request as any;
      const res = response as any;

      const cookieHeader = req.headers?.cookie;
      const userId = extractUserIdFromCookie(cookieHeader);

      const error = res.locals?.error ?? req.routeOptions?.config?.error;

      return {
        requestId: req.id,
        usuarioId: userId,
        error: error?.message ?? undefined,
      };
    },
    serializers: {
      req(request) {
        return {
          method: request.method,
          url: request.url,
          statusCode: request.raw?.statusCode,
          headers: {
            host: request.headers?.host,
            'sec-ch-ua-platform': request.headers?.['sec-ch-ua-platform'],
            'user-agent': request.headers?.['user-agent'],
            'sec-ch-ua': request.headers?.['sec-ch-ua'],
            'content-type': request.headers?.['content-type'],
            origin: request.headers?.origin,
            referer: request.headers?.referer,
          },
          body: request.raw?.body,
        };
      },
      res(reply) {
        return {
          statusCode: reply.statusCode,
        };
      },
    },
    redact: {
      paths: ['req.headers.cookie'],
      censor: '[REDACTED]',
    },
    transport: isDevelopment
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            singleLine: true,
            translateTime: 'SYS:standard',
          },
        }
      : {
          targets: [
            {
              target: 'pino/file',
              options: { destination: 1 },
            },
            {
              target: 'pino-roll',
              options: {
                file: join(process.cwd(), 'logs', 'app.log'),
                frequency: 'daily',
                size: '100m',
                mkdir: true,
                extension: '.json',
                dateFormat: 'yyyy-MM-dd',
                limit: { count: 7 },
              },
            },
            {
              target: 'pino-roll',
              level: 'error',
              options: {
                file: join(process.cwd(), 'logs', 'error.log'),
                frequency: 'daily',
                size: '100m',
                mkdir: true,
                extension: '.json',
                dateFormat: 'yyyy-MM-dd',
                limit: { count: 7 },
              },
            },
          ],
        },
  },
};
