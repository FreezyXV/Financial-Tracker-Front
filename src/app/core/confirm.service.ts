import { Injectable, signal } from '@angular/core';

export interface ConfirmRequest {
  message: string;
  confirmLabel: string;
  danger: boolean;
  resolve: (ok: boolean) => void;
}

/** Boîte de confirmation intégrée au design (remplace window.confirm). */
@Injectable({ providedIn: 'root' })
export class ConfirmService {
  readonly current = signal<ConfirmRequest | null>(null);

  ask(message: string, opts: { confirmLabel?: string; danger?: boolean } = {}): Promise<boolean> {
    this.current()?.resolve(false);
    return new Promise((resolve) => {
      this.current.set({
        message,
        confirmLabel: opts.confirmLabel ?? (/^Supprimer/.test(message) ? 'Supprimer' : 'Confirmer'),
        danger: opts.danger ?? /supprim/i.test(message),
        resolve,
      });
    });
  }

  answer(ok: boolean): void {
    const req = this.current();
    this.current.set(null);
    req?.resolve(ok);
  }
}
