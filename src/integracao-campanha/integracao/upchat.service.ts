import { PrismaService } from 'src/config/prisma.service';
import {
  UpchatCliente,
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

@Injectable()
export class UpchatService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly httpService: HttpService,
  ) {}

  async enviaMensagem(dto: UpchatExecuta) {
    const clientesRaw = dto.clientes;
    const mensagens = this.constroiBodyMensagem(
      clientesRaw,
      dto.templateId,
      dto.nomeCampanha,
    );

    const body = {
      queueId: dto.config.queueId,
      apiKey: dto.config.apiKey,
      messages: mensagens,
    };

    try {
      const resultado = await firstValueFrom(
        this.httpService.request<UpchatMessagesResponse>({
          method: 'POST',
          url: `${dto.config.url}/int/enqueueMessagesToSend`,
          data: body,
        }),
      );

      const enqueueIds = resultado.data.sucess;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const status = enqueueIds.map(async (enqueueId) => {
        const bodyStatus = {
          queueId: dto.config.queueId,
          apiKey: dto.config.apiKey,
          enqueueId: enqueueId.enqueueId,
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
      });

      return;
    } catch (error: unknown) {
      if (error instanceof AxiosError) {
        throw new BadRequestException(
          `API retornou erro. Status: ${error.code}`,
        );
      }

      throw new InternalServerErrorException(`Erro interno de servidor`);
    }
  }

  constroiBodyMensagem(
    clientesRaw: UpchatCliente[],
    templateId: number,
    nomeCampanha: string,
  ) {
    return clientesRaw.map((cliente) => {
      const varsTemplate =
        cliente.parametros.length > 0 ? cliente.parametros : [];

      return {
        templateId: templateId,
        number: cliente.telefone,
        country: 'BR',
        campaignName: nomeCampanha,
        varsdata: varsTemplate,
        hidden: false,
      };
    });
  }
}
