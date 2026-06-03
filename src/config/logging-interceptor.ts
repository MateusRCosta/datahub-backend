import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { PinoLogger } from 'nestjs-pino';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly CHAVES_SENSIVEIS = [
    'senha',
    'password',
    'novasenha',
    'antigasenha',
  ];

  constructor(private readonly logger: PinoLogger) {}

  private limpar(body: unknown): unknown {
    const resultado: unknown = JSON.parse(JSON.stringify(body));
    const pilha: unknown[] = [resultado];

    while (pilha.length > 0) {
      const atual = pilha.pop();

      if (Array.isArray(atual)) {
        pilha.push(...atual);
        continue;
      }

      if (atual && typeof atual === 'object') {
        for (const [key, value] of Object.entries(
          atual as Record<string, unknown>,
        )) {
          if (this.CHAVES_SENSIVEIS.includes(key.toLowerCase())) {
            (atual as Record<string, unknown>)[key] = '[REDACTED]';
          } else {
            pilha.push(value);
          }
        }
      }
    }

    return resultado;
  }

  intercept(context: ExecutionContext, next: CallHandler) {
    const req = context.switchToHttp().getRequest<FastifyRequest>();

    if (req.body && typeof req.body === 'object') {
      const limpo = this.limpar(req.body as Record<string, unknown>);
      this.logger.logger.setBindings({ body: limpo });
    }

    return next.handle();
  }
}
