import { guessMapping, mapRows, parseAmount, parseCsv, parseDate } from './csv';

describe('csv', () => {
  it('parse les montants français et anglo-saxons', () => {
    expect(parseAmount('1 234,56 €')).toBe(1234.56);
    expect(parseAmount('-1,234.50')).toBe(-1234.5);
    expect(parseAmount('(12,00)')).toBe(-12);
    expect(parseAmount('')).toBeNull();
    expect(parseAmount('abc')).toBeNull();
  });

  it('parse les dates usuelles', () => {
    expect(parseDate('31/12/2025')).toBe('2025-12-31');
    expect(parseDate('2025-01-05')).toBe('2025-01-05');
    expect(parseDate('05-01-25')).toBe('2025-01-05');
    expect(parseDate('12/31/2025')).toBe('2025-12-31');
    expect(parseDate('32/13/2025')).toBeNull();
  });

  it('lit un relevé BoursoBank (débit/crédit séparés, guillemets)', () => {
    const csv = '﻿Date opération;Libellé;Débit;Crédit\n02/03/2026;"CB CARREFOUR; PARIS";42,10;\n01/03/2026;VIR SALAIRE;;2 500,00\n';
    const rows = parseCsv(csv);
    expect(rows.length).toBe(3);
    expect(rows[1][1]).toBe('CB CARREFOUR; PARIS');
    const map = guessMapping(rows[0]);
    expect(map.debit).toBe(2);
    expect(map.credit).toBe(3);
    const { ok, errors } = mapRows(rows, map, true);
    expect(errors).toBe(0);
    expect(ok).toEqual([
      { date: '2026-03-02', description: 'CB CARREFOUR; PARIS', amount: -42.1 },
      { date: '2026-03-01', description: 'VIR SALAIRE', amount: 2500 },
    ]);
  });
});
