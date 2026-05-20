import { TipoCampo } from 'src/base-dados/util/type';
import { normalizaDadosCliente } from './dados-normalizer';

describe('normalizaDadosCliente', () => {
  it('encontra valor quando o cabecalho do CSV tem BOM ou espacos', () => {
    const resultado = normalizaDadosCliente(
      {
        '\uFEFF ID ': '123',
      },
      [
        {
          cabecalho: 'ID',
          tipo: TipoCampo.TEXTO,
          obrigatorio: true,
        },
      ],
    );

    expect(resultado.dados.ID).toBe('123');
    expect(resultado.validacao).toEqual([]);
  });

  it('encontra valor ignorando diferenca entre maiusculas e minusculas', () => {
    const resultado = normalizaDadosCliente(
      {
        id: '456',
      },
      [
        {
          cabecalho: 'ID',
          tipo: TipoCampo.TEXTO,
          obrigatorio: true,
        },
      ],
    );

    expect(resultado.dados.ID).toBe('456');
    expect(resultado.validacao).toEqual([]);
  });
});
