import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, OnDestroy, effect, input, viewChild } from '@angular/core';
import { Chart, ChartConfiguration, ChartType, registerables } from 'chart.js';

Chart.register(...registerables);

function cssVar(name: string, fallback: string): string {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

/** Applique la typographie et les couleurs du thème « Registre » aux graphiques. */
export function applyChartTheme(): void {
  Chart.defaults.font.family = "'IBM Plex Sans', sans-serif";
  Chart.defaults.font.size = 12;
  Chart.defaults.color = cssVar('--ink-2', '#4a5a78');
  Chart.defaults.borderColor = cssVar('--rule', '#d5dce5');
  Chart.defaults.plugins.legend.labels.boxWidth = 10;
  Chart.defaults.plugins.legend.labels.boxHeight = 10;
  Chart.defaults.plugins.tooltip.backgroundColor = cssVar('--ink', '#1b2a4a');
  Chart.defaults.plugins.tooltip.titleColor = cssVar('--sheet', '#fbfcfd');
  Chart.defaults.plugins.tooltip.bodyColor = cssVar('--sheet', '#fbfcfd');
  Chart.defaults.plugins.tooltip.padding = 10;
  Chart.defaults.plugins.tooltip.cornerRadius = 3;
  Chart.defaults.plugins.tooltip.bodyFont = { family: "'IBM Plex Mono', monospace", size: 12 };
}

@Component({
  selector: 'app-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div class="chart-box" [style.height.px]="height()"><canvas #canvas [attr.aria-label]="label()" role="img"></canvas></div>`,
  styles: [':host{display:block}.chart-box{position:relative;width:100%}'],
})
export class ChartComponent implements AfterViewInit, OnDestroy {
  config = input.required<ChartConfiguration<ChartType>>();
  height = input(260);
  label = input('Graphique');
  private canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private chart?: Chart;
  private type?: string;
  private ready = false;

  constructor() {
    effect(() => {
      const cfg = this.config();
      if (this.ready) this.render(cfg);
    });
  }

  ngAfterViewInit(): void {
    this.ready = true;
    this.render(this.config());
  }

  private render(cfg: ChartConfiguration<ChartType>): void {
    applyChartTheme();
    if (this.chart && this.type === cfg.type) {
      this.chart.data = cfg.data;
      this.chart.options = cfg.options ?? {};
      this.chart.update();
      return;
    }
    this.chart?.destroy();
    this.type = cfg.type;
    this.chart = new Chart(this.canvas().nativeElement, {
      ...cfg,
      options: { responsive: true, maintainAspectRatio: false, ...(cfg.options ?? {}) },
    });
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
  }
}
