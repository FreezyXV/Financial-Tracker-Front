/** Projection patrimoniale et indépendance financière (FIRE). */

export interface ProjectionInput {
  startCapital: number;
  monthlyContribution: number;
  annualReturn: number; // % nominal
  inflation: number; // %
  years: number;
  annualContributionGrowth: number; // % d'augmentation annuelle des versements
  monthlyExpense: number; // dépenses actuelles, en € d'aujourd'hui
  withdrawalRate: number; // % (règle des 4 %)
}

export interface ProjectionPoint {
  year: number;
  nominal: number;
  real: number;
  contributed: number;
  fireTarget: number;
}

export interface ProjectionResult {
  points: ProjectionPoint[];
  fireNumber: number;
  fireYear: number | null;
  finalNominal: number;
  finalReal: number;
  totalContributed: number;
  totalGains: number;
  passiveIncomeMonthly: number;
}

export function fireNumber(monthlyExpense: number, withdrawalRate: number): number {
  return withdrawalRate > 0 ? (monthlyExpense * 12) / (withdrawalRate / 100) : Infinity;
}

export function project(p: ProjectionInput): ProjectionResult {
  const r = Math.pow(1 + p.annualReturn / 100, 1 / 12) - 1;
  const inf = p.inflation / 100;
  const target0 = fireNumber(p.monthlyExpense, p.withdrawalRate);
  let capital = p.startCapital;
  let contributed = p.startCapital;
  let contribution = p.monthlyContribution;
  let fireYear: number | null = capital >= target0 ? 0 : null;
  const points: ProjectionPoint[] = [{ year: 0, nominal: capital, real: capital, contributed, fireTarget: target0 }];

  for (let y = 1; y <= p.years; y++) {
    for (let m = 0; m < 12; m++) {
      capital = capital * (1 + r) + contribution;
      contributed += contribution;
    }
    contribution *= 1 + p.annualContributionGrowth / 100;
    const deflator = Math.pow(1 + inf, y);
    const target = target0 * deflator; // objectif en euros courants
    if (fireYear === null && capital >= target) fireYear = y;
    points.push({ year: y, nominal: capital, real: capital / deflator, contributed, fireTarget: target });
  }
  const last = points[points.length - 1];
  return {
    points,
    fireNumber: target0,
    fireYear,
    finalNominal: last.nominal,
    finalReal: last.real,
    totalContributed: last.contributed,
    totalGains: last.nominal - last.contributed,
    passiveIncomeMonthly: (last.real * (p.withdrawalRate / 100)) / 12,
  };
}

/** Capital nécessaire et effort mensuel pour un objectif daté. */
export function monthlyNeeded(target: number, current: number, months: number, annualReturn: number): number {
  if (months <= 0) return Math.max(0, target - current);
  const r = Math.pow(1 + annualReturn / 100, 1 / 12) - 1;
  const fvCurrent = current * Math.pow(1 + r, months);
  const remaining = target - fvCurrent;
  if (remaining <= 0) return 0;
  return r === 0 ? remaining / months : (remaining * r) / (Math.pow(1 + r, months) - 1);
}
