import { Injectable, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';

export interface Toast {
  id: number;
  text: string;
  kind: 'ok' | 'error';
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly toasts = signal<Toast[]>([]);
  private seq = 0;

  show(text: string, kind: Toast['kind'] = 'ok'): void {
    const id = ++this.seq;
    this.toasts.update((t) => [...t, { id, text, kind }]);
    setTimeout(() => this.toasts.update((t) => t.filter((x) => x.id !== id)), 4200);
  }

  error(err: unknown, fallback = 'Une erreur est survenue.'): void {
    let msg = fallback;
    if (err instanceof HttpErrorResponse) {
      const body = err.error as { message?: string; errors?: Record<string, string[]> } | null;
      const first = body?.errors ? Object.values(body.errors)[0]?.[0] : undefined;
      msg = first ?? body?.message ?? (err.status === 0 ? 'API injoignable. Le serveur Laravel est-il lancé ?' : fallback);
    }
    this.show(msg, 'error');
  }
}
