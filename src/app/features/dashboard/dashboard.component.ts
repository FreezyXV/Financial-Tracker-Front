import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { ASSET_CLASSES } from '../../core/labels';
import { Dashboard } from '../../core/models';
import { StoreService } from '../../core/store.service';
import { ChartComponent } from '../../shared/chart.component';
import { cashflowChart, css, doughnutChart, lineChart } from '../../shared/charts';
import { monthLabel } from '../../shared/format';
import { IconComponent } from '../../shared/icon.component';
import { PIPES } from '../../shared/pipes';

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
  data = signal<Dashboard | null>(null);
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
