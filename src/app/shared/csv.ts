/** Outils d'import de relevés bancaires (CSV français ou anglo-saxons). */

export function detectDelimiter(text: string): string {
  const head = text.split(/\r?\n/).slice(0, 5).join('\n');
  const counts: [string, number][] = [';', ',', '\t', '|'].map((d) => [d, head.split(d).length]);
  counts.sort((a, b) => b[1] - a[1]);
  return counts[0][0];
}

/** Parseur CSV avec guillemets, retours ligne dans les champs et BOM. */
export function parseCsv(text: string, delimiter?: string): string[][] {
  const src = text.replace(/^﻿/, '');
  const d = delimiter ?? detectDelimiter(src);
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') {
        quoted = false;
      } else {
        field += c;
      }
    } else if (c === '"') {
      quoted = true;
    } else if (c === d) {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++;
      row.push(field);
      if (row.some((x) => x.trim() !== '')) rows.push(row.map((x) => x.trim()));
      row = [];
      field = '';
    } else {
      field += c;
    }
  }
  row.push(field);
  if (row.some((x) => x.trim() !== '')) rows.push(row.map((x) => x.trim()));
  return rows;
}

/** "1 234,56 €", "-1,234.56", "(12.00)" → nombre. */
export function parseAmount(raw: string | undefined | null): number | null {
  if (raw === undefined || raw === null) return null;
  let s = String(raw).replace(/[\s  €$£]/g, '').replace(/EUR|USD/gi, '');
  if (!s) return null;
  let neg = false;
  if (/^\(.*\)$/.test(s)) {
    neg = true;
    s = s.slice(1, -1);
  }
  if (s.endsWith('-')) {
    neg = true;
    s = s.slice(0, -1);
  }
  const lastComma = s.lastIndexOf(',');
  const lastDot = s.lastIndexOf('.');
  if (lastComma > lastDot) {
    s = s.replace(/\./g, '').replace(',', '.');
  } else {
    s = s.replace(/,/g, '');
  }
  const n = Number(s);
  if (Number.isNaN(n)) return null;
  return neg ? -Math.abs(n) : n;
}

/** "31/12/2025", "31-12-25", "2025-12-31", "12/31/2025" (si mois > 12 impossible) → "YYYY-MM-DD". */
export function parseDate(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const s = raw.trim().slice(0, 10);
  let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/);
  if (m) {
    let [, a, b, y] = m;
    if (y.length === 2) y = `20${y}`;
    let day = Number(a);
    let month = Number(b);
    if (month > 12 && day <= 12) [day, month] = [month, day];
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    return `${y}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }
  return null;
}

export interface CsvMapping {
  date: number;
  description: number;
  amount: number | null;
  debit: number | null;
  credit: number | null;
  invert: boolean;
}

/** Devine les colonnes à partir de l'en-tête. */
export function guessMapping(header: string[]): CsvMapping {
  const find = (...keys: string[]) => header.findIndex((h) => keys.some((k) => h.toLowerCase().includes(k)));
  const debit = find('débit', 'debit');
  const credit = find('crédit', 'credit');
  const amount = find('montant', 'amount', 'valeur');
  return {
    date: Math.max(0, find('date op', 'date')),
    description: Math.max(0, find('libell', 'label', 'description', 'intitul', 'détail', 'detail')),
    amount: amount >= 0 ? amount : null,
    debit: debit >= 0 ? debit : null,
    credit: credit >= 0 ? credit : null,
    invert: false,
  };
}

export interface ImportRow {
  date: string;
  description: string;
  amount: number;
}

export function mapRows(rows: string[][], map: CsvMapping, hasHeader: boolean): { ok: ImportRow[]; errors: number } {
  const ok: ImportRow[] = [];
  let errors = 0;
  for (const r of rows.slice(hasHeader ? 1 : 0)) {
    const date = parseDate(r[map.date]);
    let amount: number | null = null;
    if (map.amount !== null) {
      amount = parseAmount(r[map.amount]);
    } else {
      const deb = map.debit !== null ? parseAmount(r[map.debit]) : null;
      const cred = map.credit !== null ? parseAmount(r[map.credit]) : null;
      if (deb) amount = -Math.abs(deb);
      else if (cred) amount = Math.abs(cred);
    }
    if (!date || amount === null) {
      errors++;
      continue;
    }
    ok.push({ date, description: (r[map.description] ?? '').replace(/\s+/g, ' '), amount: map.invert ? -amount : amount });
  }
  return { ok, errors };
}
