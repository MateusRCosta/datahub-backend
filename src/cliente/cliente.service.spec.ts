import { BadRequestException } from '@nestjs/common';
import { TipoCampo } from 'src/base-dados/util/type';
import { ClientesCriacaoService } from './cliente-criacao.service';
import { ClientesService } from './cliente.service';

describe('ClientesService', () => {
  let service: ClientesService;
  let prisma: {
    cliente: {
      findFirst: jest.Mock;
      update: jest.Mock;
    };
  };

  beforeEach(() => {
    prisma = {
      cliente: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
    };

    const prismaService = {
      $transaction: jest.fn((callback: (tx: typeof prisma) => unknown) =>
        callback(prisma),
      ),
    };

    const clientesCriacaoService = {
      geraHash: jest.fn(),
    };

    service = new ClientesService(
      prismaService as never,
      clientesCriacaoService as unknown as ClientesCriacaoService,
    );
  });

  it('retorna BadRequest e nao salva quando os dados possuem erro de campo', async () => {
    prisma.cliente.findFirst.mockResolvedValue({
      id: 1,
      baseDeDados: {
        id: 10,
        estrutura: [
          {
            cabecalho: 'email',
            tipo: TipoCampo.EMAIL,
            obrigatorio: true,
          },
        ],
      },
      dados: {
        email: 'antigo@example.com',
      },
    });

    await expect(
      service.atualiza(1, {
        dados: {
          email: 'email-invalido',
        },
      }),
    ).rejects.toThrow(BadRequestException);

    expect(prisma.cliente.update).not.toHaveBeenCalled();
  });
});
