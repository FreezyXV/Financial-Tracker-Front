import { ChangeDetectionStrategy, Component, OnInit, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { OPERATION_TYPES } from '../../core/labels';
import { Account, Asset, Operation } from '../../core/models';
import { ToastService } from '../../core/toast.service';
import { today } from '../../shared/format';
import { PIPES } from '../../shared/pipes';

interface OpDraft {
  account_id: number | null;
  asset_id: number | null;
  type: Operation['type'];
  quantity: number | null;
  price: number | null;
  fees: number | null;
  fx_rate: number | null;
  amount: number | null;
  date: string;
  notes: string;
}

@Component({
  selector: 'app-operation-form',
  imports: [FormsModule, ...PIPES],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form class="form" (ngSubmit)="save()">
      <div class="segmented">
        @for (t of types; track t.key) { <button type="button" [class.on]="d().type === t.key" (click)="patch({ type: t.key })">{{ t.label }}</button> }
      </div>
      <div class="row">
        <label class="field"><span>Enveloppe</span>
          <select name="acc" required [ngModel]="d().account_id" (ngModelChange)="patch({ account_id: $event })">
            @for (a of accounts(); track a.id) { <option [ngValue]="a.id">{{ a.name }}</option> }
          </select>
        </label>
        <label class="field"><span>Date</span><input type="date" name="date" required [ngModel]="d().date" (ngModelChange)="patch({ date: $event })" /></label>
      </div>
      @if (needsAsset()) {
        <label class="field"><span>Actif</span>
          <select name="asset" [required]="trade()" [ngModel]="d().asset_id" (ngModelChange)="patch({ asset_id: $event })">
            @if (!trade()) { <option [ngValue]="null">— Aucun (frais ou intérêts du compte) —</option> }
            @for (a of choices(); track a.id) { <option [ngValue]="a.id">{{ a.symbol }} — {{ a.name }}</option> }
          </select>
          <small>@if (isPea() && d().type === 'buy') { Actifs éligibles PEA uniquement · } <button type="button" class="link" (click)="newAsset.emit()">+ Ajouter un actif</button></small>
        </label>
      }
      @if (trade()) {
        <div class="row three">
          <label class="field"><span>Quantité</span><input type="number" step="any" min="0" name="qty" required [ngModel]="d().quantity" (ngModelChange)="patch({ quantity: $event })" /></label>
          <label class="field"><span>Prix unitaire ({{ currency() }})</span><input type="number" step="any" min="0" name="price" required [ngModel]="d().price" (ngModelChange)="patch({ price: $event })" /></label>
          <label class="field"><span>Frais (€)</span><input type="number" step="0.01" min="0" name="fees" [ngModel]="d().fees" (ngModelChange)="patch({ fees: $event })" /></label>
        </div>
        @if (currency() !== 'EUR') {
          <label class="field"><span>Taux de change (1 {{ currency() }} = x €)</span><input type="number" step="any" min="0" name="fx" [ngModel]="d().fx_rate" (ngModelChange)="patch({ fx_rate: $event })" /><small>Laissez le taux actuel si vous ne connaissez pas celui du jour de l'opération.</small></label>
        }
        <div class="notice">Montant {{ d().type === 'buy' ? 'débité' : 'crédité' }} : <strong class="num">{{ total() | money }}</strong></div>
      } @else {
        <label class="field"><span>Montant net (€)</span><input type="number" step="0.01" min="0" name="amount" required [ngModel]="d().amount" (ngModelChange)="patch({ amount: $event })" /></label>
      }
      <label class="field"><span>Note</span><input name="notes" maxlength="255" [ngModel]="d().notes" (ngModelChange)="patch({ notes: $event })" /></label>
      <div class="form-actions">
        @if (operation()) { <button type="button" class="btn danger" (click)="remove()">Supprimer</button> }
        <span class="spacer"></span>
        <button type="button" class="btn" (click)="closed.emit()">Annuler</button>
        <button type="submit" class="btn primary" [disabled]="busy()">Enregistrer</button>
      </div>
    </form>
  `,
})
export class OperationFormComponent implements OnInit {
  operation = input<Operation | null>(null);
  accounts = input.required<Account[]>();
  assets = input.required<Asset[]>();
  defaultAccount = input<number | null>(null);
  saved = output<void>();
  closed = output<void>();
  newAsset = output<void>();
  private api = inject(ApiService);
  private toast = inject(ToastService);
  types = Object.entries(OPERATION_TYPES).map(([key, label]) => ({ key: key as Operation['type'], label }));
  busy = signal(false);
  d = signal<OpDraft>({ account_id: null, asset_id: null, type: 'buy', quantity: null, price: null, fees: 0, fx_rate: null, amount: null, date: today(), notes: '' });

  trade = computed(() => this.d().type === 'buy' || this.d().type === 'sell');
  isPea = computed(() => ['pea', 'pea_pme'].includes(this.accounts().find((a) => a.id === this.d().account_id)?.type ?? ''));
  /** Sur un PEA, seuls les actifs éligibles sont proposés à l'achat. */
  choices = computed(() => (this.isPea() && this.d().type === 'buy' ? this.assets().filter((a) => a.pea_eligible) : this.assets()));
  needsAsset = computed(() => this.d().type !== 'interest');
  asset = computed(() => this.assets().find((a) => a.id === this.d().asset_id));
  currency = computed(() => this.asset()?.currency ?? 'EUR');
  total = computed(() => {
    const x = this.d();
    const gross = (x.quantity ?? 0) * (x.price ?? 0) * (x.fx_rate ?? this.asset()?.fx_rate ?? 1);
    return x.type === 'buy' ? gross + (x.fees ?? 0) : gross - (x.fees ?? 0);
  });

  constructor() {
    // Les listes peuvent arriver après l'ouverture du formulaire : présélection dès qu'elles sont là.
    effect(() => {
      const assets = this.assets();
      const accounts = this.accounts();
      untracked(() => {
        if (this.operation()) return;
        const x = this.d();
        if (!x.account_id && accounts.length) this.patch({ account_id: this.defaultAccount() ?? accounts[0].id });
        const list = this.choices();
        if (assets.length && (!x.asset_id || !list.some((a) => a.id === x.asset_id)) && list.length) this.patch({ asset_id: list[0].id });
      });
    });
  }

  ngOnInit(): void {
    const o = this.operation();
    if (o) {
      this.d.set({ account_id: o.account_id, asset_id: o.asset_id, type: o.type, quantity: o.quantity, price: o.price, fees: o.fees, fx_rate: o.fx_rate, amount: o.amount, date: o.date, notes: o.notes ?? '' });
    } else {
      this.patch({ account_id: this.defaultAccount() ?? this.accounts()[0]?.id ?? null, asset_id: this.assets()[0]?.id ?? null });
    }
  }

  patch(p: Partial<OpDraft>): void {
    this.d.update((x) => ({ ...x, ...p }));
    // Changement d'enveloppe ou de type : l'actif choisi doit rester proposable.
    if ((p.account_id !== undefined || p.type !== undefined) && this.d().asset_id && !this.choices().some((a) => a.id === this.d().asset_id)) {
      this.d.update((x) => ({ ...x, asset_id: this.choices()[0]?.id ?? null }));
    }
    if (p.asset_id !== undefined && !this.operation()) {
      const a = this.asset();
      this.d.update((x) => ({ ...x, fx_rate: a?.fx_rate ?? 1, price: x.price ?? (a?.current_price || null) }));
    }
  }

  save(): void {
    const x = this.d();
    const body = this.trade() ? { ...x, amount: 0 } : { ...x, quantity: 0, price: 0, fees: 0 };
    this.busy.set(true);
    const o = this.operation();
    const req = o ? this.api.put(`operations/${o.id}`, body) : this.api.post('operations', body);
    req.subscribe({
      next: () => {
        this.toast.show('Opération enregistrée.');
        this.saved.emit();
      },
      error: (e) => {
        this.busy.set(false);
        this.toast.error(e);
      },
    });
  }

  remove(): void {
    const o = this.operation();
    if (!o || !confirm('Supprimer cette opération ?')) return;
    this.api.delete(`operations/${o.id}`).subscribe({ next: () => this.saved.emit(), error: (e) => this.toast.error(e) });
  }
}
