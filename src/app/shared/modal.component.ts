import { ChangeDetectionStrategy, Component, HostListener, input, output } from '@angular/core';
import { IconComponent } from './icon.component';

@Component({
  selector: 'app-modal',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (open()) {
      <div class="modal-backdrop" (click)="closed.emit()"></div>
      <section class="modal" [class.wide]="wide()" role="dialog" aria-modal="true" [attr.aria-label]="title()">
        <header class="modal-head">
          <h2>{{ title() }}</h2>
          <button class="btn-icon" type="button" (click)="closed.emit()" aria-label="Fermer"><app-icon name="close" /></button>
        </header>
        <div class="modal-body"><ng-content /></div>
      </section>
    }
  `,
})
export class ModalComponent {
  open = input(false);
  title = input('');
  wide = input(false);
  closed = output<void>();

  @HostListener('document:keydown.escape')
  onEsc(): void {
    if (this.open()) this.closed.emit();
  }
}
