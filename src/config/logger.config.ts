import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { Params } from 'nestjs-pino';
import { FastifyRequest, FastifyReply } from 'fastify';

const isDevelopment = process.env.NODE_ENV === 'development';

const getUsuarioIdDoCookie = (
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
    const payload: unknown = JSON.parse(
      Buffer.from(token.split('.')[1], 'base64url').toString(),
    );

    if (payload !== null && typeof payload === 'object' && 'sub' in payload) {
      return String((payload as Record<string, unknown>).sub);
    }
    return null;
  } catch {
    return null;
  }
};

export const loggerConfig: Params = {
  pinoHttp: {
    level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
    genReqId: (request) =>
      request.headers['x-request-id']?.toString() || randomUUID(),
    customProps: (request) => {
      const req = request as unknown as FastifyRequest;

      const usuarioId = getUsuarioIdDoCookie(req.headers?.cookie);

      return {
        requestId: req.id,
        usuarioId: usuarioId,
        body: req.body,
      };
    },
    autoLogging: {
      ignore: (req) => req.method === 'OPTIONS',
    },
    serializers: {
      req(request: FastifyRequest) {
        return {
          method: request.method,
          url: request.url,
          headers: {
            host: request.headers?.host,
            'sec-ch-ua-platform': request.headers?.['sec-ch-ua-platform'],
            'user-agent': request.headers?.['user-agent'],
            'sec-ch-ua': request.headers?.['sec-ch-ua'],
            'content-type': request.headers?.['content-type'],
            origin: request.headers?.origin,
            referer: request.headers?.referer,
          },
        };
      },
      res(reply: FastifyReply) {
        let errorMessage: string | undefined;

        try {
          const payload = (reply as unknown as Record<string, unknown>)[
            'payload'
          ] as string;
          const parsed: unknown = JSON.parse(payload);

          errorMessage =
            parsed !== null && typeof parsed === 'object' && 'message' in parsed
              ? String((parsed as Record<string, unknown>).message)
              : undefined;
        } catch {
          errorMessage = undefined;
        }
        return {
          statusCode: reply.statusCode,
          errorMessage,
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
