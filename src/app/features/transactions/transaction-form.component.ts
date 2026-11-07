import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { Transaction, TxType } from '../../core/models';
import { StoreService } from '../../core/store.service';
import { ToastService } from '../../core/toast.service';
import { today } from '../../shared/format';

interface TxDraft {
  type: TxType;
  amount: number | null;
  date: string;
  account_id: number | null;
  transfer_account_id: number | null;
  category_id: number | null;
  description: string;
  notes: string;
}

@Component({
  selector: 'app-transaction-form',
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form class="form" (ngSubmit)="save()" #f="ngForm">
      <div class="segmented" role="tablist" aria-label="Type d'opération">
        <button type="button" [class.on]="draft().type === 'expense'" (click)="setType('expense')">Dépense</button>
        <button type="button" [class.on]="draft().type === 'income'" (click)="setType('income')">Revenu</button>
        <button type="button" [class.on]="draft().type === 'transfer'" (click)="setType('transfer')">Virement</button>
      </div>
      <div class="row">
        <label class="field"><span>Montant (€)</span>
          <input type="number" step="0.01" min="0.01" name="amount" required [ngModel]="draft().amount" (ngModelChange)="patch({ amount: $event })" autofocus />
        </label>
        <label class="field"><span>Date</span>
          <input type="date" name="date" required [ngModel]="draft().date" (ngModelChange)="patch({ date: $event })" />
        </label>
      </div>
      <label class="field"><span>Libellé</span>
        <input name="description" maxlength="255" placeholder="ex. CB Carrefour, Loyer, Salaire" [ngModel]="draft().description" (ngModelChange)="patch({ description: $event })" />
      </label>
      <div class="row">
        <label class="field"><span>{{ draft().type === 'transfer' ? 'Depuis le compte' : 'Compte' }}</span>
          <select name="account" required [ngModel]="draft().account_id" (ngModelChange)="patch({ account_id: +$event })">
            @for (a of store.activeAccounts(); track a.id) { <option [ngValue]="a.id">{{ a.name }}</option> }
          </select>
        </label>
        @if (draft().type === 'transfer') {
          <label class="field"><span>Vers le compte</span>
            <select name="to" required [ngModel]="draft().transfer_account_id" (ngModelChange)="patch({ transfer_account_id: +$event })">
              @for (a of store.activeAccounts(); track a.id) {
                @if (a.id !== draft().account_id) { <option [ngValue]="a.id">{{ a.name }}</option> }
              }
            </select>
          </label>
        } @else {
          <label class="field"><span>Catégorie</span>
            <select name="category" [ngModel]="draft().category_id" (ngModelChange)="patch({ category_id: $event })">
              <option [ngValue]="null">Automatique (règles)</option>
              @for (c of categories(); track c.id) { <option [ngValue]="c.id">{{ c.name }}</option> }
            </select>
          </label>
        }
      </div>
      <label class="field"><span>Notes</span>
        <textarea name="notes" rows="2" maxlength="2000" [ngModel]="draft().notes" (ngModelChange)="patch({ notes: $event })"></textarea>
      </label>
      <div class="form-actions">
        @if (transaction()) { <button type="button" class="btn danger" (click)="remove()">Supprimer</button> }
        <span class="spacer"></span>
        <button type="button" class="btn" (click)="closed.emit()">Annuler</button>
        <button type="submit" class="btn primary" [disabled]="busy() || !f.valid">{{ transaction() ? 'Enregistrer' : 'Ajouter' }}</button>
      </div>
    </form>
  `,
})
export class TransactionFormComponent implements OnInit {
  transaction = input<Transaction | null>(null);
  saved = output<void>();
  closed = output<void>();

  store = inject(StoreService);
  private api = inject(ApiService);
  private toast = inject(ToastService);
  busy = signal(false);
  draft = signal<TxDraft>({ type: 'expense', amount: null, date: today(), account_id: null, transfer_account_id: null, category_id: null, description: '', notes: '' });

  categories = computed(() => (this.draft().type === 'income' ? this.store.incomeCategories() : this.store.expenseCategories()));

  ngOnInit(): void {
    this.store.load();
    const t = this.transaction();
    if (t) {
      this.draft.set({ type: t.type, amount: t.amount, date: t.date, account_id: t.account_id, transfer_account_id: t.transfer_account_id, category_id: t.category_id, description: t.description ?? '', notes: t.notes ?? '' });
    } else {
      const first = this.store.activeAccounts().find((a) => a.type === 'checking') ?? this.store.activeAccounts()[0];
      this.patch({ account_id: first?.id ?? null });
    }
  }

  patch(p: Partial<TxDraft>): void {
    this.draft.update((d) => ({ ...d, ...p }));
  }

  setType(type: TxType): void {
    this.patch({ type, category_id: null });
  }

  save(): void {
    const d = this.draft();
    const body = { ...d, transfer_account_id: d.type === 'transfer' ? d.transfer_account_id : null, category_id: d.type === 'transfer' ? null : d.category_id };
    const t = this.transaction();
    this.busy.set(true);
    const req = t ? this.api.put(`transactions/${t.id}`, body) : this.api.post('transactions', body);
    req.subscribe({
      next: () => {
        this.toast.show(t ? 'Opération mise à jour.' : 'Opération ajoutée.');
        this.store.changed();
        this.saved.emit();
      },
      error: (e) => {
        this.busy.set(false);
        this.toast.error(e);
      },
    });
  }

  remove(): void {
    const t = this.transaction();
    if (!t || !confirm('Supprimer cette opération ?')) return;
    this.api.delete(`transactions/${t.id}`).subscribe({
      next: () => {
        this.toast.show('Opération supprimée.');
        this.store.changed();
        this.saved.emit();
      },
      error: (e) => this.toast.error(e),
    });
  }
}
