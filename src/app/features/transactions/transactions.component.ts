import { ChangeDetectionStrategy, Component, OnInit, computed, effect, inject, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { Transaction, TxPage } from '../../core/models';
import { StoreService } from '../../core/store.service';
import { ToastService } from '../../core/toast.service';
import { currentMonth, monthLabel, shiftMonth } from '../../shared/format';
import { IconComponent } from '../../shared/icon.component';
import { ModalComponent } from '../../shared/modal.component';
import { PIPES } from '../../shared/pipes';
import { ImportComponent } from './import.component';
import { TransactionFormComponent } from './transaction-form.component';

interface Filters {
  month: string | null;
  search: string;
  account_id: number | null;
  category_id: number | 'none' | null;
  type: string;
}

@Component({
  selector: 'app-transactions',
  imports: [FormsModule, IconComponent, ModalComponent, TransactionFormComponent, ImportComponent, ...PIPES],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './transactions.component.html',
  styleUrl: './transactions.component.scss',
})
export class TransactionsComponent implements OnInit {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);
  private toast = inject(ToastService);
  store = inject(StoreService);

  filters = signal<Filters>({ month: currentMonth(), search: '', account_id: null, category_id: null, type: '' });
  page = signal<TxPage | null>(null);
  items = signal<Transaction[]>([]);
  loading = signal(false);
  selected = signal<Set<number>>(new Set());
  bulkCategory: number | null = null;
  editing = signal<Transaction | null>(null);
  creating = signal(false);
  importing = signal(false);
  private searchTimer?: ReturnType<typeof setTimeout>;
  private ready = false;

  monthTitle = computed(() => {
    const m = this.filters().month;
    return m ? monthLabel(m, 'long') : 'Toutes les dates';
  });
  allSelected = computed(() => this.items().length > 0 && this.items().every((t) => this.selected().has(t.id)));

  constructor() {
    effect(() => {
      this.store.version();
      if (this.ready) untracked(() => this.load());
    });
  }

  ngOnInit(): void {
    this.store.load();
    const q = this.route.snapshot.queryParamMap;
    const cat = q.get('category_id');
    const acc = q.get('account_id');
    if (cat || acc) {
      this.filters.update((f) => ({ ...f, month: null, category_id: cat === 'none' ? 'none' : cat ? +cat : null, account_id: acc ? +acc : null }));
    }
    this.ready = true;
    this.load();
  }

  private params(page = 1) {
    const f = this.filters();
    return { page, per_page: 100, month: f.month, search: f.search, account_id: f.account_id, category_id: f.category_id, type: f.type };
  }

  load(): void {
    this.loading.set(true);
    this.selected.set(new Set());
    this.api.get<TxPage>('transactions', this.params()).subscribe({
      next: (p) => {
        this.page.set(p);
        this.items.set(p.data);
        this.loading.set(false);
      },
      error: (e) => {
        this.loading.set(false);
        this.toast.error(e);
      },
    });
  }

  more(): void {
    const p = this.page();
    if (!p || p.current_page >= p.last_page) return;
    this.api.get<TxPage>('transactions', this.params(p.current_page + 1)).subscribe((np) => {
      this.page.set(np);
      this.items.update((i) => [...i, ...np.data]);
    });
  }

  patch(p: Partial<Filters>): void {
    this.filters.update((f) => ({ ...f, ...p }));
    this.load();
  }

  onSearch(v: string): void {
    this.filters.update((f) => ({ ...f, search: v }));
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.load(), 300);
  }

  shift(delta: number): void {
    this.patch({ month: shiftMonth(this.filters().month ?? currentMonth(), delta) });
  }

  toggle(id: number): void {
    this.selected.update((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  clearSelection(): void {
    this.selected.set(new Set());
  }

  toggleAll(): void {
    this.selected.set(this.allSelected() ? new Set() : new Set(this.items().map((t) => t.id)));
  }

  recategorize(t: Transaction, categoryId: number | null): void {
    this.api.put<Transaction>(`transactions/${t.id}`, { category_id: categoryId }).subscribe({
      next: (u) => this.items.update((list) => list.map((x) => (x.id === t.id ? { ...x, category_id: u.category_id, category: u.category } : x))),
      error: (e) => this.toast.error(e),
    });
  }

  bulk(action: 'categorize' | 'delete'): void {
    const ids = [...this.selected()];
    if (!ids.length) return;
    if (action === 'delete' && !confirm(`Supprimer ${ids.length} opération(s) ?`)) return;
    if (action === 'categorize' && !this.bulkCategory) return;
    this.api.post<{ affected: number }>('transactions/bulk', { ids, action, category_id: this.bulkCategory }).subscribe({
      next: (r) => {
        this.toast.show(`${r.affected} opération(s) ${action === 'delete' ? 'supprimée(s)' : 'catégorisée(s)'}.`);
        this.store.changed();
      },
      error: (e) => this.toast.error(e),
    });
  }

  export(): void {
    const f = this.filters();
    this.api.blob('transactions/export', { month: f.month, search: f.search, account_id: f.account_id, category_id: f.category_id, type: f.type }).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `operations-${f.month ?? 'toutes'}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: (e) => this.toast.error(e),
    });
  }

  categoriesFor(t: Transaction) {
    return t.type === 'income' ? this.store.incomeCategories() : this.store.expenseCategories();
  }

  accountName(id: number | null): string {
    return this.store.accounts().find((a) => a.id === id)?.name ?? '';
  }
}
