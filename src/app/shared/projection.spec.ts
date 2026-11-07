import { fireNumber, monthlyNeeded, project } from './projection';

describe('projection', () => {
  const base = { startCapital: 0, monthlyContribution: 1000, annualReturn: 0, inflation: 0, years: 10, annualContributionGrowth: 0, monthlyExpense: 2000, withdrawalRate: 4 };

  it('calcule le nombre FIRE (règle des 4 %)', () => {
    expect(fireNumber(2000, 4)).toBe(600000);
  });

  it('sans rendement, le capital égale les versements', () => {
    const r = project(base);
    expect(r.finalNominal).toBeCloseTo(120000, 6);
    expect(r.totalGains).toBeCloseTo(0, 6);
    expect(r.fireYear).toBeNull();
  });

  it('les intérêts composés avancent la date FIRE', () => {
    const r = project({ ...base, startCapital: 100000, annualReturn: 7, years: 40 });
    expect(r.fireYear).not.toBeNull();
    expect(r.fireYear!).toBeLessThan(25);
    expect(r.finalNominal).toBeGreaterThan(r.totalContributed);
  });

  it('effort mensuel pour un objectif daté', () => {
    expect(monthlyNeeded(12000, 0, 12, 0)).toBeCloseTo(1000, 6);
    expect(monthlyNeeded(1000, 2000, 12, 5)).toBe(0);
    expect(monthlyNeeded(12000, 0, 12, 5)).toBeLessThan(1000);
  });
});
