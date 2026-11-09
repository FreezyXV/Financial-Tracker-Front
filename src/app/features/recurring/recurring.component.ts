import { ConfirmService } from '../../core/confirm.service';
import { ChangeDetectionStrategy, Component, effect, inject, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { FREQUENCIES } from '../../core/labels';
import { Recurring, RecurringList, RecurringSuggestion, TxType } from '../../core/models';
import { StoreService } from '../../core/store.service';
import { ToastService } from '../../core/toast.service';
import { IconComponent } from '../../shared/icon.component';
import { ModalComponent } from '../../shared/modal.component';
import { PIPES } from '../../shared/pipes';
import { today } from '../../shared/format';

interface RecDraft {
  id?: number;
  type: TxType;
  amount: number | null;
  description: string;
  account_id: number | null;
  transfer_account_id: number | null;
  category_id: number | null;
  frequency: Recurring['frequency'];
  next_date: string;
  end_date: string | null;
  is_subscription: boolean;
  is_active: boolean;
  auto_post: boolean;
}

@Component({
  selector: 'app-recurring',
  imports: [FormsModule, IconComponent, ModalComponent, ...PIPES],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <div class="page-head">
        <div>
          <h1>Échéances et abonnements</h1>
          <p>Salaire, loyer, abonnements, virements programmés vers le PEA. Les échéances arrivées à terme sont passées en écriture automatiquement.</p>
        </div>
        <div class="actions">
          <button class="btn" type="button" (click)="post()"><app-icon name="check" size="16" /> Passer les échéances dues</button>
          <button class="btn primary" type="button" (click)="open()"><app-icon name="plus" size="16" /> Nouvelle échéance</button>
        </div>
      </div>

      @if (list(); as l) {
        <section class="grid g-4">
          <div class="sheet figure"><span class="label">Abonnements</span><span class="value debit">{{ l.totals.subscriptions_monthly | money }}</span><span class="sub">par mois · {{ l.totals.subscriptions_monthly * 12 | money: 'round' }} par an</span></div>
          <div class="sheet figure"><span class="label">Charges fixes</span><span class="value">{{ l.totals.expenses_monthly | money: 'round' }}</span><span class="sub">par mois</span></div>
          <div class="sheet figure"><span class="label">Revenus programmés</span><span class="value credit">{{ l.totals.income_monthly | money: 'round' }}</span><span class="sub">par mois</span></div>
          <div class="sheet figure"><span class="label">Épargne automatique</span><span class="value">{{ l.totals.transfers_monthly | money: 'round' }}</span><span class="sub">virements par mois</span></div>
        </section>

        <section class="grid g-main">
          <article class="sheet ledger">
            <div class="sheet-head"><h3>Échéancier</h3></div>
            <div class="table-wrap">
              <table class="ledger-table">
                <thead><tr><th>Libellé</th><th class="hide-sm">Fréquence</th><th>Prochaine</th><th class="num">Montant</th><th class="num hide-sm">/ mois</th><th></th></tr></thead>
                <tbody>
                  @for (r of l.items; track r.id) {
                    <tr [class.muted]="!r.is_active">
                      <td>{{ r.description }} @if (r.is_subscription) { <span class="tag">abonnement</span> } @if (!r.is_active) { <span class="tag">en pause</span> }
                        <br /><span class="xs muted">{{ r.category?.name ?? (r.type === 'transfer' ? 'Virement' : '') }} · {{ r.account?.name }}</span></td>
                      <td class="hide-sm small soft">{{ freq[r.frequency] }}</td>
                      <td class="nowrap small">{{ r.next_date | frDate }}</td>
                      <td class="num" [class.credit]="r.type === 'income'">{{ r.type === 'expense' ? '−' : r.type === 'income' ? '+' : '' }}{{ r.amount | money }}</td>
                      <td class="num soft hide-sm">{{ r.monthly_amount | money }}</td>
                      <td class="row-actions"><button class="btn-icon" type="button" (click)="open(r)" aria-label="Modifier"><app-icon name="edit" size="16" /></button></td>
                    </tr>
                  } @empty { <tr><td colspan="6"><div class="empty">Aucune échéance.</div></td></tr> }
                </tbody>
              </table>
            </div>
          </article>
          <article class="sheet">
            <div class="sheet-head"><h3>30 prochains jours</h3></div>
            <div class="list">
              @for (u of l.upcoming; track u.recurring_id + u.date) {
                <div class="list-item small"><span class="num muted" style="width: 52px">{{ u.date | frDate: 'day' }}</span><span class="grow ellipsis">{{ u.description }}</span><span class="num" [class.credit]="u.type === 'income'">{{ u.amount | money }}</span></div>
              } @empty { <p class="empty">Rien de prévu.</p> }
            </div>
          </article>
        </section>
      }

      @if (suggestions().length) {
        <section class="sheet">
          <div class="sheet-head"><h3>Prélèvements récurrents détectés</h3><span class="small muted">Repérés dans vos 7 derniers mois d'opérations</span></div>
          <div class="list">
            @for (s of suggestions(); track s.description) {
              <div class="list-item">
                <div class="grow"><strong class="small">{{ s.description }}</strong><br /><span class="xs muted">{{ s.occurrences }} fois · dernier le {{ s.last_date | frDate }} · {{ s.yearly_cost | money: 'round' }} par an</span></div>
                <span class="num">{{ s.amount | money }}</span>
                <button class="btn" type="button" (click)="adopt(s)">Suivre</button>
              </div>
            }
          </div>
        </section>
      }
    </div>

    <app-modal [open]="!!draft()" [title]="draft()?.id ? 'Modifier l’échéance' : 'Nouvelle échéance'" (closed)="draft.set(null)">
      @if (draft(); as d) {
        <form class="form" (ngSubmit)="save()">
          <div class="segmented">
            <button type="button" [class.on]="d.type === 'expense'" (click)="patch({ type: 'expense', category_id: null })">Dépense</button>
            <button type="button" [class.on]="d.type === 'income'" (click)="patch({ type: 'income', category_id: null })">Revenu</button>
            <button type="button" [class.on]="d.type === 'transfer'" (click)="patch({ type: 'transfer', category_id: null })">Virement</button>
          </div>
          <div class="row">
            <label class="field"><span>Libellé</span><input name="desc" required [ngModel]="d.description" (ngModelChange)="patch({ description: $event })" /></label>
            <label class="field"><span>Montant (€)</span><input type="number" step="0.01" min="0.01" name="amount" required [ngModel]="d.amount" (ngModelChange)="patch({ amount: $event })" /></label>
          </div>
          <div class="row">
            <label class="field"><span>Compte</span>
              <select name="acc" required [ngModel]="d.account_id" (ngModelChange)="patch({ account_id: $event })">@for (a of store.activeAccounts(); track a.id) { <option [ngValue]="a.id">{{ a.name }}</option> }</select>
            </label>
            @if (d.type === 'transfer') {
              <label class="field"><span>Vers</span>
                <select name="to" required [ngModel]="d.transfer_account_id" (ngModelChange)="patch({ transfer_account_id: $event })">@for (a of store.activeAccounts(); track a.id) { @if (a.id !== d.account_id) { <option [ngValue]="a.id">{{ a.name }}</option> } }</select>
              </label>
            } @else {
              <label class="field"><span>Catégorie</span>
                <select name="cat" [ngModel]="d.category_id" (ngModelChange)="patch({ category_id: $event })">
                  <option [ngValue]="null">—</option>
                  @for (c of d.type === 'income' ? store.incomeCategories() : store.expenseCategories(); track c.id) { <option [ngValue]="c.id">{{ c.name }}</option> }
                </select>
              </label>
            }
          </div>
          <div class="row three">
            <label class="field"><span>Fréquence</span>
              <select name="freq" [ngModel]="d.frequency" (ngModelChange)="patch({ frequency: $event })">@for (f of freqList; track f.key) { <option [value]="f.key">{{ f.label }}</option> }</select>
            </label>
            <label class="field"><span>Prochaine échéance</span><input type="date" name="nd" required [ngModel]="d.next_date" (ngModelChange)="patch({ next_date: $event })" /></label>
            <label class="field"><span>Fin (optionnel)</span><input type="date" name="ed" [ngModel]="d.end_date" (ngModelChange)="patch({ end_date: $event || null })" /></label>
          </div>
          <label class="check"><input type="checkbox" name="sub" [ngModel]="d.is_subscription" (ngModelChange)="patch({ is_subscription: $event })" /> C'est un abonnement (compté dans le coût des abonnements)</label>
          <label class="check"><input type="checkbox" name="auto" [ngModel]="d.auto_post" (ngModelChange)="patch({ auto_post: $event })" /> Créer l'opération automatiquement à l'échéance</label>
          <label class="check"><input type="checkbox" name="act" [ngModel]="d.is_active" (ngModelChange)="patch({ is_active: $event })" /> Active</label>
          <div class="form-actions">
            @if (d.id) { <button type="button" class="btn danger" (click)="remove()">Supprimer</button> }
            <span class="spacer"></span>
            <button type="button" class="btn" (click)="draft.set(null)">Annuler</button>
            <button type="submit" class="btn primary">Enregistrer</button>
          </div>
        </form>
      }
    </app-modal>
  `,
  styles: ['@media(max-width:640px){.hide-sm{display:none}}'],
})
export class RecurringComponent {
  private api = inject(ApiService);
  private confirmDialog = inject(ConfirmService);
  private toast = inject(ToastService);
  store = inject(StoreService);
  list = signal<RecurringList | null>(null);
  suggestions = signal<RecurringSuggestion[]>([]);
  draft = signal<RecDraft | null>(null);
  freq = FREQUENCIES;
  freqList = Object.entries(FREQUENCIES).map(([key, label]) => ({ key, label }));

  constructor() {
    this.store.load();
    effect(() => {
      this.store.version();
      untracked(() => this.load());
    });
  }

  load(): void {
    forkJoin({ list: this.api.get<RecurringList>('recurring'), sugg: this.api.get<RecurringSuggestion[]>('recurring/suggestions') }).subscribe({
      next: ({ list, sugg }) => {
        this.list.set(list);
        this.suggestions.set(sugg);
      },
      error: (e) => this.toast.error(e),
    });
  }

  open(r?: Recurring): void {
    this.draft.set(r ? { id: r.id, type: r.type, amount: r.amount, description: r.description, account_id: r.account_id, transfer_account_id: r.transfer_account_id, category_id: r.category_id, frequency: r.frequency, next_date: r.next_date, end_date: r.end_date, is_subscription: r.is_subscription, is_active: r.is_active, auto_post: r.auto_post }
      : { type: 'expense', amount: null, description: '', account_id: this.store.activeAccounts()[0]?.id ?? null, transfer_account_id: null, category_id: null, frequency: 'monthly', next_date: today(), end_date: null, is_subscription: false, is_active: true, auto_post: true });
  }

  adopt(s: RecurringSuggestion): void {
    this.draft.set({ type: 'expense', amount: s.amount, description: s.description, account_id: s.account_id, transfer_account_id: null, category_id: s.category_id, frequency: 'monthly', next_date: s.next_date, end_date: null, is_subscription: true, is_active: true, auto_post: false });
  }

  patch(p: Partial<RecDraft>): void {
    this.draft.update((d) => (d ? { ...d, ...p } : d));
  }

  save(): void {
    const d = this.draft();
    if (!d) return;
    const req = d.id ? this.api.put(`recurring/${d.id}`, d) : this.api.post('recurring', d);
    req.subscribe({ next: () => { this.draft.set(null); this.toast.show('Échéance enregistrée.'); this.store.changed(); }, error: (e) => this.toast.error(e) });
  }

  async remove(): Promise<void> {
    const d = this.draft();
    if (!d?.id || !(await this.confirmDialog.ask('Supprimer cette échéance ? Les opérations déjà passées sont conservées.'))) return;
    this.api.delete(`recurring/${d.id}`).subscribe({ next: () => { this.draft.set(null); this.load(); }, error: (e) => this.toast.error(e) });
  }

  post(): void {
    this.api.post<{ created: number }>('recurring/post').subscribe({ next: (r) => { this.toast.show(`${r.created} opération(s) créée(s).`); this.store.changed(); }, error: (e) => this.toast.error(e) });
  }
}
