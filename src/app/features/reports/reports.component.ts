import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ChartConfiguration, ChartType } from 'chart.js';
import { ApiService } from '../../core/api.service';
import { MonthlyReport, YearlyReport } from '../../core/models';
import { StoreService } from '../../core/store.service';
import { ToastService } from '../../core/toast.service';
import { ChartComponent } from '../../shared/chart.component';
import { cashflowChart, css, lineChart } from '../../shared/charts';
import { currentMonth, monthLabel, shiftMonth } from '../../shared/format';
import { IconComponent } from '../../shared/icon.component';
import { PIPES } from '../../shared/pipes';

@Component({
  selector: 'app-reports',
  imports: [RouterLink, ChartComponent, IconComponent, ...PIPES],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './reports.component.html',
  styleUrl: './reports.component.scss',
})
export class ReportsComponent {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private store = inject(StoreService);
  mode = signal<'month' | 'year'>('month');
  month = signal(currentMonth());
  year = signal(new Date().getFullYear());
  monthly = signal<MonthlyReport | null>(null);
  yearly = signal<YearlyReport | null>(null);
  isFuture = computed(() => this.month() >= currentMonth());

  constructor() {
    effect(() => {
      this.store.version();
      const mode = this.mode();
      const m = this.month();
      const y = this.year();
      untracked(() => (mode === 'month' ? this.loadMonth(m) : this.loadYear(y)));
    });
  }

  loadMonth(m: string): void {
    this.api.get<MonthlyReport>('reports/monthly', { month: m }).subscribe({ next: (r) => this.monthly.set(r), error: (e) => this.toast.error(e) });
  }

  loadYear(y: number): void {
    this.api.get<YearlyReport>('reports/yearly', { year: y }).subscribe({ next: (r) => this.yearly.set(r), error: (e) => this.toast.error(e) });
  }

  shift(d: number): void {
    if (this.mode() === 'month') this.month.set(shiftMonth(this.month(), d));
    else this.year.update((y) => y + d);
  }

  print(): void {
    window.print();
  }

  delta(cur: number, prev: number): number | null {
    return prev ? ((cur - prev) / Math.abs(prev)) * 100 : null;
  }

  curveChart = computed<ChartConfiguration<ChartType> | null>(() => {
    this.store.version();
    const r = this.monthly();
    if (!r) return null;
    return lineChart(
      r.daily_curve.map((p) => String(p.day)),
      [
        { label: 'Ce mois', data: r.daily_curve.map((p) => p.current), color: css('--debit') },
        { label: 'Mois précédent', data: r.daily_curve.map((p) => p.previous), color: css('--ink-3'), dashed: true },
      ],
    );
  });

  maxCategory = computed(() => Math.max(1, ...(this.monthly()?.expenses_by_category ?? []).map((c) => c.amount)));

  bridge = computed(() => {
    const r = this.monthly();
    if (!r) return [];
    const nw = r.net_worth;
    const max = Math.max(Math.abs(nw.start), Math.abs(nw.end), 1);
    return [
      { label: 'Début du mois', value: nw.start, width: (Math.abs(nw.start) / max) * 100, kind: 'base' },
      { label: 'Épargne du mois', value: nw.from_savings, width: (Math.abs(nw.from_savings) / max) * 100, kind: nw.from_savings >= 0 ? 'up' : 'down' },
      { label: 'Effet marchés et autres', value: nw.from_markets, width: (Math.abs(nw.from_markets) / max) * 100, kind: nw.from_markets >= 0 ? 'up' : 'down' },
      { label: 'Fin du mois', value: nw.end, width: (Math.abs(nw.end) / max) * 100, kind: 'base' },
    ];
  });

  yearChart = computed(() => {
    this.store.version();
    const y = this.yearly();
    return y ? cashflowChart(y.months) : null;
  });

  yearNwChart = computed(() => {
    this.store.version();
    const y = this.yearly();
    return y ? lineChart(y.months.map((m) => monthLabel(m.month)), [{ label: 'Patrimoine net', data: y.months.map((m) => m.net_worth), color: css('--ink'), fill: true }]) : null;
  });

  monthName(m: string): string {
    return monthLabel(m, 'long');
  }
}
