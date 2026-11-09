import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { ApiService } from '../../core/api.service';
import { ASSET_CLASSES } from '../../core/labels';
import { Dashboard } from '../../core/models';
import { StoreService } from '../../core/store.service';
import { ChartComponent } from '../../shared/chart.component';
import { cashflowChart, css, doughnutChart, lineChart } from '../../shared/charts';
import { monthLabel } from '../../shared/format';
import { IconComponent } from '../../shared/icon.component';
import { navigateTo } from '../../shared/nav';
import { PIPES } from '../../shared/pipes';
import { readJson, writeJson } from '../../shared/storage';

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, ChartComponent, IconComponent, ...PIPES],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent {
  private api = inject(ApiService);
  private store = inject(StoreService);
  private router = inject(Router);
  auth = inject(AuthService);
  data = signal<Dashboard | null>(null);
  greeting = computed(() => {
    const h = new Date().getHours();
    const first = (this.auth.user()?.name ?? '').split(' ')[0];
    return `${h < 5 || h >= 18 ? 'Bonsoir' : 'Bonjour'}${first ? ' ' + first : ''}`;
  });
  error = signal(false);

  constructor() {
    effect(() => {
      this.store.version();
      untracked(() => this.load());
    });
  }

  load(): void {
    this.api.get<Dashboard>('dashboard').subscribe({ next: (d) => this.data.set(d), error: () => this.error.set(true) });
  }

  go(route: string): void {
    navigateTo(this.router, route);
  }

  /* Plan d'action : 3 conseils visibles, les autres à la demande ; masquage mémorisé. */
  dismissed = signal<string[]>(readJson<string[]>('ft_dismissed_tips', []));
  showAllTips = signal(false);
  tips = computed(() => (this.data()?.recommendations ?? []).filter((r) => !this.dismissed().includes(r.id)));
  visibleTips = computed(() => (this.showAllTips() ? this.tips() : this.tips().slice(0, 3)));

  dismiss(id: string): void {
    this.dismissed.update((d) => [...d, id]);
    writeJson('ft_dismissed_tips', this.dismissed());
  }

  restoreTips(): void {
    this.dismissed.set([]);
    writeJson('ft_dismissed_tips', []);
  }

  /* Premiers pas : guide tant que l'espace n'est pas alimenté. */
  hideSetup = signal(readJson<boolean>('ft_hide_setup', false));
  setup = computed(() => {
    const d = this.data();
    if (!d) return [];
    return [
      { done: d.net_worth.by_account.length > 0, label: 'Déclarer vos comptes et leurs soldes', route: '/accounts', action: 'Comptes' },
      { done: d.recent.length > 0, label: 'Importer un relevé bancaire (CSV)', route: '/transactions', action: 'Importer' },
      { done: d.budgets.length > 0, label: 'Fixer vos premiers budgets', route: '/budgets', action: 'Budgets' },
      { done: d.goals.length > 0, label: 'Définir un objectif d’épargne', route: '/goals', action: 'Objectifs' },
      { done: d.portfolio.value > 0, label: 'Ajouter vos placements (PEA, CTO, crypto)', route: '/investments', action: 'Placements' },
    ];
  });
  setupDone = computed(() => this.setup().filter((s) => s.done).length);
  showSetup = computed(() => !this.hideSetup() && this.setup().length > 0 && this.setupDone() < this.setup().length);
  hasCashflow = computed(() => (this.data()?.cashflow ?? []).some((m) => m.income > 0 || m.expense > 0));

  closeSetup(): void {
    this.hideSetup.set(true);
    writeJson('ft_hide_setup', true);
  }

  historyChart = computed(() => {
    const d = this.data();
    this.store.version();
    if (!d) return null;
    return lineChart(
      d.history.map((p) => monthLabel(p.date.slice(0, 7))),
      [
        { label: 'Patrimoine net', data: d.history.map((p) => p.net_worth), color: css('--ink'), fill: true },
        { label: 'dont placements', data: d.history.map((p) => p.investments), color: css('--credit'), dashed: true },
      ],
    );
  });

  cashChart = computed(() => {
    const d = this.data();
    this.store.version();
    return d ? cashflowChart(d.cashflow) : null;
  });

  allocation = computed(() => {
    const d = this.data();
    if (!d) return [];
    const total = Object.values(d.allocation).reduce((s, v) => s + Math.max(0, v), 0);
    return Object.entries(d.allocation)
      .filter(([, v]) => v > 0)
      .map(([k, v]) => ({ key: k, label: ASSET_CLASSES[k]?.label ?? k, value: v, color: ASSET_CLASSES[k]?.color ?? '#8a8f98', share: total ? (v / total) * 100 : 0 }));
  });

  allocChart = computed(() => {
    this.store.version();
    const a = this.allocation();
    return a.length ? doughnutChart(a) : null;
  });

  savingsGap = computed(() => {
    const d = this.data();
    return d ? d.month.savings_rate - d.indicators.savings_rate_target : 0;
  });
}
