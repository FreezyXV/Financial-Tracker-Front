import { ChangeDetectionStrategy, Component, ElementRef, HostListener, effect, inject, viewChild } from '@angular/core';
import { ConfirmService } from '../core/confirm.service';

@Component({
  selector: 'app-confirm-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (svc.current(); as c) {
      <div class="modal-backdrop confirm-backdrop" (click)="svc.answer(false)"></div>
      <section class="modal confirm" role="alertdialog" aria-modal="true" aria-labelledby="confirm-msg">
        <div class="modal-body">
          <p id="confirm-msg">{{ c.message }}</p>
          <div class="form-actions">
            <button class="btn" type="button" (click)="svc.answer(false)">Annuler</button>
            <button #ok class="btn" [class.primary]="!c.danger" [class.danger-solid]="c.danger" type="button" (click)="svc.answer(true)">{{ c.confirmLabel }}</button>
          </div>
        </div>
      </section>
    }
  `,
  styles: [`.confirm-backdrop{z-index:70}.confirm{z-index:71;width:min(420px,calc(100vw - 32px))}.confirm p{font-size:var(--fs-lg);line-height:1.45;margin:4px 0 8px}`],
})
export class ConfirmDialogComponent {
  svc = inject(ConfirmService);
  private ok = viewChild<ElementRef<HTMLButtonElement>>('ok');

  constructor() {
    effect(() => this.ok()?.nativeElement.focus());
  }

  @HostListener('document:keydown.escape')
  onEsc(): void {
    if (this.svc.current()) this.svc.answer(false);
  }
}
