import { ChartConfiguration, ChartType, TooltipItem } from 'chart.js';
import { compactMoney, money, monthLabel } from './format';

export function css(name: string, fallback = '#888'): string {
  if (typeof document === 'undefined') return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

type Cfg = ChartConfiguration<ChartType>;

const moneyTick = (v: string | number) => compactMoney(Number(v));
const moneyTooltip = (ctx: TooltipItem<ChartType>) => `${ctx.dataset.label ?? ''} : ${money(Number(ctx.parsed.y ?? ctx.parsed))}`;

export function lineChart(labels: string[], series: { label: string; data: (number | null)[]; color: string; fill?: boolean; dashed?: boolean }[]): Cfg {
  return {
    type: 'line',
    data: {
      labels,
      datasets: series.map((s) => ({
        label: s.label,
        data: s.data,
        borderColor: s.color,
        backgroundColor: s.fill ? `${s.color}1f` : s.color,
        fill: s.fill ? 'origin' : false,
        borderWidth: 2,
        borderDash: s.dashed ? [5, 4] : [],
        pointRadius: 0,
        pointHoverRadius: 4,
        tension: 0.25,
        spanGaps: false,
      })),
    },
    options: {
      interaction: { mode: 'index', intersect: false },
      plugins: { legend: { display: series.length > 1, position: 'bottom', align: 'start' }, tooltip: { callbacks: { label: moneyTooltip } } },
      scales: {
        x: { grid: { display: false }, ticks: { maxRotation: 0, autoSkipPadding: 16 } },
        y: { ticks: { callback: moneyTick }, grid: { color: css('--rule') }, border: { display: false } },
      },
    },
  };
}

export function cashflowChart(points: { month: string; income: number; expense: number; savings_rate: number }[]): Cfg {
  return {
    type: 'bar',
    data: {
      labels: points.map((p) => monthLabel(p.month)),
      datasets: [
        { label: 'Revenus', data: points.map((p) => p.income), backgroundColor: css('--credit'), borderRadius: 2, maxBarThickness: 18 },
        { label: 'Dépenses', data: points.map((p) => p.expense), backgroundColor: css('--debit'), borderRadius: 2, maxBarThickness: 18 },
      ],
    },
    options: {
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { position: 'bottom', align: 'start' },
        tooltip: {
          callbacks: {
            label: moneyTooltip,
            footer: (items) => {
              const p = points[items[0]?.dataIndex ?? 0];
              return p ? `Taux d'épargne : ${p.savings_rate.toLocaleString('fr-FR')} %` : '';
            },
          },
        },
      },
      scales: {
        x: { grid: { display: false } },
        y: { ticks: { callback: moneyTick }, grid: { color: css('--rule') }, border: { display: false } },
      },
    },
  };
}

export function doughnutChart(items: { label: string; value: number; color: string }[]): Cfg {
  const cfg: ChartConfiguration<'doughnut'> = {
    type: 'doughnut',
    data: {
      labels: items.map((i) => i.label),
      datasets: [{ data: items.map((i) => i.value), backgroundColor: items.map((i) => i.color), borderColor: css('--sheet'), borderWidth: 2 }],
    },
    options: {
      cutout: '68%',
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: (ctx) => `${ctx.label} : ${money(Number(ctx.parsed), { decimals: false })}` } },
      },
    },
  };
  return cfg as unknown as Cfg;
}

export function barChart(labels: string[], data: number[], color: string, label = ''): Cfg {
  return {
    type: 'bar',
    data: { labels, datasets: [{ label, data, backgroundColor: color, borderRadius: 2, maxBarThickness: 22 }] },
    options: {
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: moneyTooltip } } },
      scales: {
        x: { grid: { display: false } },
        y: { ticks: { callback: moneyTick }, grid: { color: css('--rule') }, border: { display: false } },
      },
    },
  };
}
