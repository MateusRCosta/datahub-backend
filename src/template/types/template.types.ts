import { IntegracaoCampanha, Template, Usuario } from '@prisma/client';
import { UpchatConfigTemplate } from './template-upchat.types';

export type Config = UpchatConfigTemplate;

export type TemplateFindAll = Pick<Template, 'id' | 'nome'> & {
  integracaoCampanha: IntegracaoCampanhaFindAllTemplate;
  usuario: Pick<Usuario, 'id' | 'nome'>;
};

export type TemplateFindOne = Pick<
  Template,
  'id' | 'nome' | 'config' | 'createdAt' | 'updatedAt'
> & {
  integracaoCampanha: IntegracaoCampanhaFindAllTemplate;
  usuario: Pick<Usuario, 'id' | 'nome'>;
};

type IntegracaoCampanhaFindAllTemplate = Pick<
  IntegracaoCampanha,
  'id' | 'nome' | 'provedor'
>;
