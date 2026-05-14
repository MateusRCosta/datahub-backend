import { IntegracaoCampanha, Template } from '@prisma/client';
import { UpchatConfigTemplate } from './template-upchat.types';

export type Config = UpchatConfigTemplate;

export type TemplateFindAll = Pick<Template, 'id' | 'nome'> & {
  integracaoCampanha: IntegracaoCampanhaFindAllTemplate;
};

export type TemplateFindOne = Pick<
  Template,
  'id' | 'nome' | 'config' | 'createdAt' | 'updatedAt'
> & {
  integracaoCampanha: IntegracaoCampanhaFindAllTemplate;
};

type IntegracaoCampanhaFindAllTemplate = Pick<
  IntegracaoCampanha,
  'id' | 'nome' | 'provedor'
>;
