import { Pipe, PipeTransform } from '@angular/core';
import { money, pct } from './format';

@Pipe({ name: 'money' })
export class MoneyPipe implements PipeTransform {
  transform(v: number | null | undefined, mode: '' | 'signed' | 'round' | 'signed-round' = '', currency?: string): string {
    return money(v, { signed: mode.startsWith('signed'), decimals: !mode.endsWith('round'), currency });
  }
}

@Pipe({ name: 'pct' })
export class PctPipe implements PipeTransform {
  transform(v: number | null | undefined, signed = false, digits = 1): string {
    return pct(v, signed, digits);
  }
}

@Pipe({ name: 'frDate' })
export class FrDatePipe implements PipeTransform {
  transform(v: string | null | undefined, style: 'short' | 'long' | 'day' = 'short'): string {
    if (!v) return '—';
    const d = new Date(v.length === 10 ? `${v}T00:00:00` : v);
    if (style === 'day') return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
    return d.toLocaleDateString('fr-FR', style === 'long' ? { day: 'numeric', month: 'long', year: 'numeric' } : { day: '2-digit', month: '2-digit', year: 'numeric' });
  }
}

/** Classe CSS selon le signe : crédit (vert) / débit (rouge). */
@Pipe({ name: 'sign' })
export class SignPipe implements PipeTransform {
  transform(v: number | null | undefined): string {
    if (!v) return '';
    return v > 0 ? 'credit' : 'debit';
  }
}

export const PIPES = [MoneyPipe, PctPipe, FrDatePipe, SignPipe] as const;
