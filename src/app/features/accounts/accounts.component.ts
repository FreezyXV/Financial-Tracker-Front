import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { ACCOUNT_TYPES, AccountTypeMeta, GROUPS, PALETTE, isInvestmentType } from '../../core/labels';
import { Account } from '../../core/models';
import { StoreService } from '../../core/store.service';
import { ToastService } from '../../core/toast.service';
import { IconComponent } from '../../shared/icon.component';
import { ModalComponent } from '../../shared/modal.component';
import { PIPES } from '../../shared/pipes';

interface AccountDraft {
  id?: number;
  name: string;
  type: string;
  institution: string;
  opening_balance: number;
  opened_at: string | null;
  manual_value: number | null;
  interest_rate: number | null;
  color: string;
  include_in_net_worth: boolean;
  is_archived: boolean;
}

const GROUP_ORDER = ['liquidites', 'epargne', 'investissements', 'crypto', 'immobilier', 'autres', 'dettes'];

@Component({
  selector: 'app-accounts',
  imports: [FormsModule, RouterLink, IconComponent, ModalComponent, ...PIPES],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './accounts.component.html',
  styleUrl: './accounts.component.scss',
})
export class AccountsComponent {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  store = inject(StoreService);
  onboarding = !!inject(ActivatedRoute).snapshot.queryParamMap.get('onboarding');

  types = Object.entries(ACCOUNT_TYPES).map(([key, m]) => ({ key, ...m }));
  palette = PALETTE;
  showArchived = signal(false);
  draft = signal<AccountDraft | null>(null);

  groups = computed(() => {
    const list = this.store.accounts().filter((a) => this.showArchived() || !a.is_archived);
    return GROUP_ORDER.map((g) => {
      const accounts = list.filter((a) => (ACCOUNT_TYPES[a.type]?.group ?? 'autres') === g);
      return { key: g, label: GROUPS[g]?.label ?? g, color: GROUPS[g]?.color ?? '#888', accounts, total: accounts.filter((a) => a.include_in_net_worth).reduce((s, a) => s + a.value, 0) };
    }).filter((g) => g.accounts.length);
  });
  netWorth = computed(() => this.store.accounts().filter((a) => a.include_in_net_worth).reduce((s, a) => s + a.value, 0));
  archivedCount = computed(() => this.store.accounts().filter((a) => a.is_archived).length);

  constructor() {
    this.store.load(true);
  }

  meta(type: string): AccountTypeMeta | undefined {
    return ACCOUNT_TYPES[type];
  }

  isInvestment(type: string): boolean {
    return isInvestmentType(type);
  }

  /** Remplissage du plafond réglementaire. */
  ceiling(a: Account): { used: number; max: number; pct: number } | null {
    const max = a.ceiling ?? ACCOUNT_TYPES[a.type]?.ceiling;
    if (!max) return null;
    const used = a.deposits ?? a.balance;
    return { used, max, pct: Math.min(100, (used / max) * 100) };
  }

  taxFreeReached(a: Account): boolean {
    return !!a.tax_free_date && a.tax_free_date <= new Date().toISOString().slice(0, 10);
  }

  open(a?: Account): void {
    this.draft.set(
      a
        ? { id: a.id, name: a.name, type: a.type, institution: a.institution ?? '', opening_balance: a.opening_balance, opened_at: a.opened_at, manual_value: a.manual_value, interest_rate: a.interest_rate, color: a.color, include_in_net_worth: a.include_in_net_worth, is_archived: a.is_archived }
        : { name: '', type: 'checking', institution: '', opening_balance: 0, opened_at: null, manual_value: null, interest_rate: null, color: PALETTE[this.store.accounts().length % PALETTE.length], include_in_net_worth: true, is_archived: false },
    );
  }

  patch(p: Partial<AccountDraft>): void {
    this.draft.update((d) => (d ? { ...d, ...p } : d));
  }

  save(): void {
    const d = this.draft();
    if (!d) return;
    const body = { ...d, manual_value: d.manual_value === null || (d.manual_value as unknown) === '' ? null : d.manual_value };
    const req = d.id ? this.api.put(`accounts/${d.id}`, body) : this.api.post('accounts', body);
    req.subscribe({
      next: () => {
        this.toast.show(d.id ? 'Compte mis à jour.' : 'Compte créé.');
        this.draft.set(null);
        this.store.changed();
      },
      error: (e) => this.toast.error(e),
    });
  }

  remove(): void {
    const d = this.draft();
    if (!d?.id || !confirm(`Supprimer « ${d.name} » et toutes ses opérations ? Préférez l'archivage pour garder l'historique.`)) return;
    this.api.delete(`accounts/${d.id}`).subscribe({
      next: () => {
        this.toast.show('Compte supprimé.');
        this.draft.set(null);
        this.store.changed();
      },
      error: (e) => this.toast.error(e),
    });
  }
}
