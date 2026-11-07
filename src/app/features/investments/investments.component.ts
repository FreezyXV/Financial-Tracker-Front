import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { ACCOUNT_TYPES, ASSET_CLASSES, OPERATION_TYPES, PALETTE } from '../../core/labels';
import { Asset, Operation, Paginated, Portfolio, Position } from '../../core/models';
import { StoreService } from '../../core/store.service';
import { ToastService } from '../../core/toast.service';
import { ChartComponent } from '../../shared/chart.component';
import { barChart, css, doughnutChart, lineChart } from '../../shared/charts';
import { monthLabel } from '../../shared/format';
import { IconComponent } from '../../shared/icon.component';
import { ModalComponent } from '../../shared/modal.component';
import { PIPES } from '../../shared/pipes';
import { AssetFormComponent } from './asset-form.component';
import { OperationFormComponent } from './operation-form.component';

type AllocView = 'by_class' | 'by_region' | 'by_sector';

@Component({
  selector: 'app-investments',
  imports: [RouterLink, ChartComponent, IconComponent, ModalComponent, AssetFormComponent, OperationFormComponent, ...PIPES],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './investments.component.html',
  styleUrl: './investments.component.scss',
})
export class InvestmentsComponent {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  store = inject(StoreService);

  data = signal<Portfolio | null>(null);
  assets = signal<Asset[]>([]);
  operations = signal<Operation[]>([]);
  accountFilter = signal<number | null>(null);
  allocView = signal<AllocView>('by_class');
  tab = signal<'positions' | 'operations' | 'assets' | 'closed'>('positions');
  refreshing = signal(false);
  opModal = signal<{ op: Operation | null } | null>(null);
  assetModal = signal<{ asset: Asset | null } | null>(null);
  opLabels = OPERATION_TYPES;

  investAccounts = computed(() => this.store.activeAccounts().filter((a) => ACCOUNT_TYPES[a.type]?.investment && a.manual_value === null));
  positions = computed<Position[]>(() => {
    const f = this.accountFilter();
    return (this.data()?.positions ?? []).filter((p) => !f || p.account_id === f);
  });
  posTotals = computed(() => {
    const p = this.positions();
    const value = p.reduce((s, x) => s + x.value, 0);
    const cost = p.reduce((s, x) => s + x.cost, 0);
    return { value, cost, unrealized: value - cost, pct: cost ? ((value - cost) / cost) * 100 : 0, dividends: p.reduce((s, x) => s + x.dividends, 0) };
  });

  allocation = computed(() => {
    const d = this.data();
    if (!d) return [];
    const src = d.allocation[this.allocView()] ?? {};
    const total = Object.values(src).reduce((s, v) => s + v, 0);
    return Object.entries(src).map(([k, v], i) => ({
      key: k,
      label: this.allocView() === 'by_class' ? ASSET_CLASSES[k]?.label ?? k : k,
      value: v,
      share: total ? (v / total) * 100 : 0,
      color: this.allocView() === 'by_class' ? ASSET_CLASSES[k]?.color ?? '#8a8f98' : PALETTE[i % PALETTE.length],
    }));
  });
  allocChart = computed(() => {
    this.store.version();
    const a = this.allocation();
    return a.length ? doughnutChart(a) : null;
  });
  historyChart = computed(() => {
    this.store.version();
    const d = this.data();
    return d ? lineChart(d.history.map((h) => monthLabel(h.date.slice(0, 7))), [{ label: 'Valeur des placements', data: d.history.map((h) => h.value), color: css('--credit'), fill: true }]) : null;
  });
  dividendChart = computed(() => {
    this.store.version();
    const d = this.data();
    return d ? barChart(d.dividends_by_month.map((m) => monthLabel(m.month)), d.dividends_by_month.map((m) => m.amount), css('--brass'), 'Dividendes et intérêts') : null;
  });
  dividends12m = computed(() => (this.data()?.dividends_by_month ?? []).reduce((s, m) => s + m.amount, 0));
  stalePrices = computed(() => this.assets().filter((a) => a.price_source !== 'manual' && (!a.price_updated_at || Date.now() - new Date(a.price_updated_at).getTime() > 3 * 86400000)).length);

  constructor() {
    this.store.load();
    effect(() => {
      this.store.version();
      untracked(() => this.load());
    });
  }

  load(): void {
    forkJoin({
      portfolio: this.api.get<Portfolio>('portfolio'),
      assets: this.api.get<Asset[]>('assets'),
      ops: this.api.get<Paginated<Operation>>('operations', { per_page: 100 }),
    }).subscribe({
      next: ({ portfolio, assets, ops }) => {
        this.data.set(portfolio);
        this.assets.set(assets);
        this.operations.set(ops.data);
      },
      error: (e) => this.toast.error(e),
    });
  }

  refresh(): void {
    this.refreshing.set(true);
    this.api.post<{ updated: number; failed: string[] }>('assets/refresh').subscribe({
      next: (r) => {
        this.refreshing.set(false);
        this.toast.show(`${r.updated} cours mis à jour${r.failed.length ? ` · indisponibles : ${r.failed.join(', ')}` : ''}.`, r.failed.length && !r.updated ? 'error' : 'ok');
        this.store.changed();
      },
      error: (e) => {
        this.refreshing.set(false);
        this.toast.error(e);
      },
    });
  }

  accountType(t: string): string {
    return ACCOUNT_TYPES[t]?.label ?? t;
  }

  classLabel(k: string): string {
    return ASSET_CLASSES[k]?.label ?? k;
  }

  taxFree(date?: string): boolean {
    return !!date && date <= new Date().toISOString().slice(0, 10);
  }

  onOpSaved(): void {
    this.opModal.set(null);
    this.store.changed();
  }

  onAssetSaved(): void {
    const reopen = this.opModal() !== null;
    this.assetModal.set(null);
    this.api.get<Asset[]>('assets').subscribe((a) => {
      this.assets.set(a);
      if (!reopen) this.store.changed();
    });
  }
}
