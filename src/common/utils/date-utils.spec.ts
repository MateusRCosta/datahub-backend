import { TipoCampo, TipoData } from '../types/dados.types';
import { incrementaData } from './date-utils';

describe('incrementaData', () => {
  it.each<[TipoData, string, string]>([
    [TipoCampo.UTC, '2025-12-31', '2026-01-01'],
    [TipoCampo.YYYY_MM_DD, '2025/12/31', '2026/01/01'],
    [TipoCampo.MM_DD_YYYY, '12/31/2025', '01/01/2026'],
    [TipoCampo.DD_MM_YYYY, '31/12/2025', '01/01/2026'],
  ])('incrementa %s preservando seu formato', (tipo, value, esperado) => {
    expect(incrementaData(value, tipo)).toBe(esperado);
  });

  it('nao incrementa data invalida', () => {
    expect(incrementaData('31/02/2025', TipoCampo.DD_MM_YYYY)).toBe(
      '31/02/2025',
    );
  });
});
