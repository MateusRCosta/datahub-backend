import {
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { AxiosError } from 'axios';
import { of, throwError } from 'rxjs';
import { PROVEDOR_INTEGRACAO_CAMPANHA } from '../types/provedor-integracao-campanha.type';
import { UpchatExecuta } from '../types/upchat.type';
import { UpchatService } from './upchat.service';

type HttpServiceMock = {
  request: jest.Mock;
};

describe('UpchatService', () => {
  let service: UpchatService;
  let httpService: HttpServiceMock;
  let consoleLogSpy: jest.SpyInstance;

  const dto: UpchatExecuta = {
    provedor: PROVEDOR_INTEGRACAO_CAMPANHA.UPCHAT,
    config: {
      url: 'https://api.example.com',
      queueId: 1,
      apiKey: 'api-key',
    },
    clientes: [
      {
        meio: '5511999999999',
        parametros: [
          {
            variavel: 'nome',
            valor: 'Joao',
          },
        ],
      },
    ],
    templateConfig: {
      id: 10,
      tituloTemplate: 'Titulo',
      mensagemTemplate: 'Mensagem',
      rodapeTemplate: 'Rodape',
      botoes: [],
    },
    nomeCampanha: 'Campanha',
  };

  beforeEach(() => {
    httpService = {
      request: jest.fn(),
    };
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

    service = new UpchatService(httpService as unknown as HttpService);
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    jest.clearAllMocks();
  });

  it('constroiBodyMensagem monta mensagens para Upchat', () => {
    expect(service.constroiBodyMensagem(dto.clientes, 10, 'Campanha')).toEqual([
      {
        templateId: 10,
        number: '5511999999999',
        country: 'BR',
        campaignName: 'Campanha',
        varsdata: ['Joao'],
        hidden: false,
      },
    ]);
  });

  it('enviaMensagem enfileira mensagens e consulta status', async () => {
    httpService.request
      .mockReturnValueOnce(
        of({
          status: 200,
          data: {
            success: [{ enqueuedId: 123 }],
            fails: [],
            successCount: 1,
            failCount: 0,
          },
        }),
      )
      .mockReturnValueOnce(
        of({
          status: 200,
          data: {
            mId: 'message-id',
            kId: 123,
            status: 2,
          },
        }),
      );

    await expect(service.enviaMensagem(dto)).resolves.toBeUndefined();

    expect(httpService.request).toHaveBeenCalledTimes(2);
    const [enqueueRequest] = httpService.request.mock.calls[0] as [
      {
        method: string;
        url: string;
        data: {
          queueId: number;
          apiKey: string;
          messages: unknown[];
        };
      },
    ];
    expect(enqueueRequest.method).toBe('POST');
    expect(enqueueRequest.url).toBe(
      'https://api.example.com/int/enqueueMessagesToSend',
    );
    expect(enqueueRequest.data.queueId).toBe(1);
    expect(enqueueRequest.data.apiKey).toBe('api-key');
    expect(enqueueRequest.data.messages).toHaveLength(1);

    const [statusRequest] = httpService.request.mock.calls[1] as [
      {
        method: string;
        url: string;
        data: {
          queueId: number;
          apiKey: string;
          enqueueId: number;
        };
        validateStatus: (status: number) => boolean;
      },
    ];
    expect(statusRequest.url).toBe(
      'https://api.example.com/int/checkEnqueuedMessage',
    );
    expect(statusRequest.data.enqueueId).toBe(123);
    expect(statusRequest.validateStatus(500)).toBe(true);
  });

  it('enviaMensagem converte AxiosError em BadRequestException', async () => {
    httpService.request.mockReturnValue(
      throwError(() => new AxiosError('bad request', '400')),
    );

    await expect(service.enviaMensagem(dto)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('enviaMensagem converte erro inesperado em InternalServerErrorException', async () => {
    httpService.request.mockReturnValue(
      throwError(() => new Error('falha inesperada')),
    );

    await expect(service.enviaMensagem(dto)).rejects.toThrow(
      InternalServerErrorException,
    );
  });
});
