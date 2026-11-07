const eur = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });
const eur0 = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
const compact = new Intl.NumberFormat('fr-FR', { notation: 'compact', maximumFractionDigits: 1 });

export function money(v: number | null | undefined, opts: { decimals?: boolean; signed?: boolean; currency?: string } = {}): string {
  if (v === null || v === undefined || Number.isNaN(v)) return '—';
  const fmt = opts.currency && opts.currency !== 'EUR'
    ? new Intl.NumberFormat('fr-FR', { style: 'currency', currency: opts.currency })
    : opts.decimals === false ? eur0 : eur;
  const s = fmt.format(v);
  return opts.signed && v > 0 ? `+${s}` : s;
}

export function compactMoney(v: number): string {
  return `${compact.format(v)} €`;
}

export function pct(v: number | null | undefined, signed = false, digits = 1): string {
  if (v === null || v === undefined || Number.isNaN(v)) return '—';
  const s = v.toLocaleString('fr-FR', { minimumFractionDigits: digits, maximumFractionDigits: digits });
  return `${signed && v > 0 ? '+' : ''}${s} %`;
}

export function monthLabel(ym: string, style: 'long' | 'short' = 'short'): string {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString('fr-FR', style === 'short' ? { month: 'short' } : { month: 'long', year: 'numeric' });
}

export function shiftMonth(ym: string, delta: number): string {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
