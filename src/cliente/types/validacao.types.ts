export type Validacao = {
  cabecalho: string;
  codigo: string;
  mensagem: string;
};

export type DadosNormalizado = {
  dados: Record<string, unknown>;
  validacao: Validacao[];
};

export type ParseResultado =
  | {
      ok: true;
      value: unknown;
    }
  | {
      ok: false;
      code: string;
      message: string;
      value: unknown;
    };
