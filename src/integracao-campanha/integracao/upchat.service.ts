import {
  UpchatExecuta,
  UpchatMessagesResponse,
  UpchatStatusResponse,
} from '../types/upchat.type';
import { firstValueFrom } from 'rxjs';
import { HttpService } from '@nestjs/axios';
import { AxiosError } from 'axios';
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { Mensagem } from '../types/execucao.type';

@Injectable()
export class UpchatService {
  constructor(private readonly httpService: HttpService) {}

  async enviaMensagem(dto: UpchatExecuta) {
    console.log('[UpchatService] Iniciando envio de mensagem', {
      campanha: dto.nomeCampanha,
      templateConfigId: dto.templateConfig.id,
      totalClientes: dto.clientes.length,
    });

    const clientesRaw = dto.clientes;
    const mensagens = this.constroiBodyMensagem(
      clientesRaw,
      dto.templateConfig.id,
      dto.nomeCampanha,
    );

    const body = {
      queueId: dto.config.queueId,
      apiKey: dto.config.apiKey,
      messages: mensagens,
    };

    try {
      console.log('[UpchatService] Enviando mensagens para Upchat', {
        url: `${dto.config.url}/int/enqueueMessagesToSend`,
        totalMensagens: mensagens.length,
      });

      const resultado = await firstValueFrom(
        this.httpService.request<UpchatMessagesResponse>({
          method: 'POST',
          url: `${dto.config.url}/int/enqueueMessagesToSend`,
          data: body,
        }),
      );

      const enqueueIds = resultado.data.success ?? [];
      console.log('[UpchatService] Mensagens enfileiradas', {
        totalEnfileiradas: enqueueIds.length,
        enqueueIds,
      });

      const status = await Promise.all(
        enqueueIds.map(async (enqueueId) => {
          const bodyStatus = {
            queueId: dto.config.queueId,
            apiKey: dto.config.apiKey,
            enqueueId: enqueueId.enqueuedId,
          };
          const responseStatus = await firstValueFrom(
            this.httpService.request<UpchatStatusResponse>({
              method: 'POST',
              url: `${dto.config.url}/int/checkEnqueuedMessage`,
              data: bodyStatus,
              validateStatus: () => true,
            }),
          );
          if (responseStatus.status === 200) {
            return responseStatus.data.status;
          }

          return 0;
        }),
      );

      console.log('[UpchatService] Status das mensagens consultado', {
        status,
      });

      return;
    } catch (error: unknown) {
      console.log('[UpchatService] Erro ao enviar mensagem', error);

      if (error instanceof AxiosError) {
        throw new BadRequestException(
          `API retornou erro. Status: ${error.code}`,
        );
      }

      throw new InternalServerErrorException(`Erro interno de servidor`);
    }
  }

  constroiBodyMensagem(
    clientesRaw: Mensagem[],
    templateConfigId: number,
    nomeCampanha: string,
  ) {
    return clientesRaw.map((cliente) => {
      const varsTemplate =
        cliente.parametros.length > 0 ? cliente.parametros : [];

      return {
        templateId: templateConfigId,
        number: cliente.meio,
        country: 'BR',
        campaignName: nomeCampanha,
        varsdata: varsTemplate,
        hidden: false,
      };
    });
  }
}
