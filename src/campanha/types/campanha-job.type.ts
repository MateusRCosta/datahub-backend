export type CampanhaReservada = {
  readonly id: number;
};

export type ViewRowCampanha = Record<string, unknown> & {
  readonly _clienteId: number;
};
