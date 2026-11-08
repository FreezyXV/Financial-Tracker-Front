import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { StoreService } from '../../core/store.service';
import { ChartComponent } from '../../shared/chart.component';
import { css, lineChart } from '../../shared/charts';
import { PIPES } from '../../shared/pipes';
import { ProjectionInput, project } from '../../shared/projection';

interface Defaults {
  birth_year: number | null;
  risk: 'prudent' | 'balanced' | 'dynamic' | null;
  monthly_invest: number | null;
  goals: string[];
  net_worth: number;
  invested: number;
  monthly_expense: number;
  monthly_savings: number;
}

const SCENARIOS = [
  { key: 'prudent', label: 'Prudent', ret: 4 },
  { key: 'central', label: 'Central', ret: 6 },
  { key: 'dynamique', label: 'Dynamique', ret: 8 },
];

@Component({
  selector: 'app-simulator',
  imports: [FormsModule, ChartComponent, ...PIPES],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <div class="page-head">
        <div>
          <h1>Projection</h1>
          <p>Combien vaudra votre patrimoine, et quand vos placements pourront couvrir vos dépenses (indépendance financière). Valeurs pré-remplies avec vos 6 derniers mois.</p>
        </div>
      </div>

      <section class="grid g-main">
        <article class="sheet">
          <div class="sheet-head"><h3>Évolution projetée</h3>
            <div class="segmented">@for (s of scenarios; track s.key) { <button type="button" [class.on]="p().annualReturn === s.ret" (click)="set({ annualReturn: s.ret })">{{ s.label }} {{ s.ret }} %</button> }</div>
          </div>
          <app-chart [config]="chart()" [height]="300" label="Projection du capital" />
          <p class="xs muted">Montants en euros d'aujourd'hui (corrigés de l'inflation), sauf la courbe « nominal ». Rendements non garantis : hypothèse lissée, hors fiscalité.</p>
        </article>

        <article class="sheet ledger">
          <div class="sheet-head"><h3>Résultat</h3></div>
          <div class="figure"><span class="label">Indépendance financière</span>
            <span class="value big">@if (r().fireYear !== null) { <span class="marker">{{ fireAge() }}</span> } @else { <span class="debit">au-delà de {{ p().years }} ans</span> }</span>
            <span class="sub">Objectif : {{ r().fireNumber | money: 'round' }} (dépenses annuelles ÷ {{ p().withdrawalRate }} %)</span>
          </div>
          <hr class="rule" />
          <dl class="kv">
            <div><dt>Capital dans {{ p().years }} ans</dt><dd class="num">{{ r().finalReal | money: 'round' }}</dd></div>
            <div><dt>dont versements</dt><dd class="num soft">{{ r().totalContributed | money: 'round' }}</dd></div>
            <div><dt>dont intérêts composés (nominal)</dt><dd class="num credit">{{ r().totalGains | money: 'round' }}</dd></div>
            <div><dt>Revenu passif mensuel</dt><dd class="num">{{ r().passiveIncomeMonthly | money: 'round' }}</dd></div>
            <div><dt>+100 €/mois avancerait l'objectif de</dt><dd class="num">{{ gain100() }}</dd></div>
          </dl>
        </article>
      </section>

      <section class="sheet">
        <div class="sheet-head"><h3>Hypothèses</h3><button class="link" type="button" (click)="reset()">Revenir à mes chiffres</button></div>
        <div class="form params">
          <label class="field"><span>Capital de départ (€)</span><input type="number" [ngModel]="p().startCapital" (ngModelChange)="set({ startCapital: +$event })" /><small>Placements actuels : {{ defaults()?.invested | money: 'round' }}</small></label>
          <label class="field"><span>Épargne investie / mois (€)</span><input type="number" [ngModel]="p().monthlyContribution" (ngModelChange)="set({ monthlyContribution: +$event })" /></label>
          <label class="field"><span>Hausse annuelle de l'épargne (%)</span><input type="number" step="0.5" [ngModel]="p().annualContributionGrowth" (ngModelChange)="set({ annualContributionGrowth: +$event })" /></label>
          <label class="field"><span>Rendement annuel (%)</span><input type="number" step="0.5" [ngModel]="p().annualReturn" (ngModelChange)="set({ annualReturn: +$event })" /><small>MSCI World long terme ≈ 6–8 % nominal</small></label>
          <label class="field"><span>Inflation (%)</span><input type="number" step="0.1" [ngModel]="p().inflation" (ngModelChange)="set({ inflation: +$event })" /></label>
          <label class="field"><span>Dépenses mensuelles visées (€)</span><input type="number" [ngModel]="p().monthlyExpense" (ngModelChange)="set({ monthlyExpense: +$event })" /></label>
          <label class="field"><span>Taux de retrait (%)</span><input type="number" step="0.25" [ngModel]="p().withdrawalRate" (ngModelChange)="set({ withdrawalRate: +$event })" /><small>Règle des 4 % ; 3–3,5 % plus prudent</small></label>
          <label class="field"><span>Âge actuel</span><input type="number" [ngModel]="age()" (ngModelChange)="age.set(+$event)" /></label>
          <label class="field"><span>Horizon (années)</span><input type="number" min="1" max="60" [ngModel]="p().years" (ngModelChange)="set({ years: +$event })" /></label>
        </div>
      </section>
    </div>
  `,
  styles: [`.params{grid-template-columns:repeat(3,minmax(0,1fr))}@media(max-width:760px){.params{grid-template-columns:1fr 1fr}}
    .kv{margin:0;display:grid}.kv div{display:flex;justify-content:space-between;gap:12px;padding:7px 0;border-bottom:1px solid var(--rule);font-size:var(--fs-sm)}
    .kv dt{color:var(--ink-2)}.kv dd{margin:0}`],
})
export class SimulatorComponent {
  private api = inject(ApiService);
  private store = inject(StoreService);
  scenarios = SCENARIOS;
  defaults = signal<Defaults | null>(null);
  age = signal(30);
  p = signal<ProjectionInput>({ startCapital: 10000, monthlyContribution: 500, annualReturn: 6, inflation: 2, years: 30, annualContributionGrowth: 1, monthlyExpense: 2500, withdrawalRate: 4 });

  r = computed(() => project(this.p()));
  fireAge = computed(() => {
    const y = this.r().fireYear;
    if (y === null) return '';
    return y === 0 ? 'atteinte' : `dans ${y} an${y > 1 ? 's' : ''} · à ${this.age() + y} ans`;
  });
  gain100 = computed(() => {
    const base = this.r().fireYear;
    const plus = project({ ...this.p(), monthlyContribution: this.p().monthlyContribution + 100 }).fireYear;
    if (base === null || plus === null) return '—';
    const diff = base - plus;
    return diff > 0 ? `${diff} an${diff > 1 ? 's' : ''}` : 'moins d’un an';
  });

  chart = computed(() => {
    this.store.version();
    const pts = this.r().points;
    const deflated = pts.map((x) => x.fireTarget / Math.pow(1 + this.p().inflation / 100, x.year));
    return lineChart(
      pts.map((x) => (x.year === 0 ? 'Auj.' : `${x.year} a`)),
      [
        { label: 'Capital (euros constants)', data: pts.map((x) => Math.round(x.real)), color: css('--credit'), fill: true },
        { label: 'Capital nominal', data: pts.map((x) => Math.round(x.nominal)), color: css('--ink-3'), dashed: true },
        { label: 'Versements cumulés', data: pts.map((x) => Math.round(x.contributed)), color: css('--ink-2') },
        { label: 'Objectif FIRE', data: deflated.map((v) => Math.round(v)), color: css('--brass'), dashed: true },
      ],
    );
  });

  constructor() {
    this.api.get<Defaults>('simulator/defaults').subscribe((d) => {
      this.defaults.set(d);
      this.reset();
    });
  }

  set(patch: Partial<ProjectionInput>): void {
    this.p.update((x) => ({ ...x, ...patch }));
  }

  reset(): void {
    const d = this.defaults();
    if (!d) return;
    const ret = d.risk === 'prudent' ? 4 : d.risk === 'dynamic' ? 8 : 6;
    if (d.birth_year) {
      this.age.set(new Date().getFullYear() - d.birth_year);
      this.set({ years: Math.max(10, Math.min(45, 67 - this.age())) });
    }
    this.set({
      startCapital: Math.round(d.invested || d.net_worth),
      monthlyContribution: Math.round(d.monthly_invest || d.monthly_savings) || 300,
      monthlyExpense: Math.round(d.monthly_expense) || 2000,
      annualReturn: ret,
    });
  }
}
