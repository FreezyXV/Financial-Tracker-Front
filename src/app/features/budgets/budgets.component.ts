import { ConfirmService } from '../../core/confirm.service';
import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { BudgetRow, MonthlyReport } from '../../core/models';
import { StoreService } from '../../core/store.service';
import { ToastService } from '../../core/toast.service';
import { currentMonth, monthLabel, shiftMonth } from '../../shared/format';
import { IconComponent } from '../../shared/icon.component';
import { ModalComponent } from '../../shared/modal.component';
import { PIPES } from '../../shared/pipes';

interface BudgetDraft {
  id?: number;
  category_id: number | null;
  amount: number | null;
  alert_threshold: number;
  rollover: boolean;
  start_date: string | null;
  end_date: string | null;
}

@Component({
  selector: 'app-budgets',
  imports: [FormsModule, IconComponent, ModalComponent, ...PIPES],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <div class="page-head">
        <div>
          <h1>Budgets</h1>
          <p>Une enveloppe mensuelle par catégorie. La projection estime la dépense de fin de mois au rythme actuel ; le report ajoute le reliquat du mois précédent.</p>
        </div>
        <div class="actions">
          <div class="period-nav">
            <button class="btn-icon" type="button" (click)="shift(-1)" aria-label="Mois précédent"><app-icon name="chevronLeft" /></button>
            <strong>{{ label() }}</strong>
            <button class="btn-icon" type="button" (click)="shift(1)" aria-label="Mois suivant"><app-icon name="chevronRight" /></button>
          </div>
          <button class="btn primary" type="button" (click)="open()"><app-icon name="plus" size="16" /> Nouveau budget</button>
        </div>
      </div>

      <section class="grid g-4">
        <div class="sheet figure"><span class="label">Budgété</span><span class="value">{{ totals().limit | money: 'round' }}</span></div>
        <div class="sheet figure"><span class="label">Dépensé</span><span class="value">{{ totals().spent | money: 'round' }}</span><span class="sub">{{ totals().pct | pct: false : 0 }} de l'enveloppe</span></div>
        <div class="sheet figure"><span class="label">Reste</span><span class="value" [class]="totals().limit - totals().spent | sign">{{ totals().limit - totals().spent | money: 'round' }}</span></div>
        <div class="sheet figure"><span class="label">Dépassements</span><span class="value" [class.debit]="totals().over > 0">{{ totals().over }}</span><span class="sub">sur {{ rows().length }} budgets</span></div>
      </section>

      <section class="sheet ledger">
        <div class="table-wrap">
          <table class="ledger-table">
            <thead><tr><th>Catégorie</th><th style="width: 34%">Consommation</th><th class="num">Dépensé</th><th class="num">Enveloppe</th><th class="num">Reste</th><th class="num hide-sm">Projection</th><th></th></tr></thead>
            <tbody>
              @for (b of rows(); track b.id) {
                <tr>
                  <td><span class="cat"><span class="dot" [style.background]="b.color"></span>{{ b.name }}</span>
                    @if (b.rollover) { <span class="tag" title="Le reliquat du mois précédent est reporté">report {{ b.carry_over | money: 'round' }}</span> }</td>
                  <td><div class="gauge" [class]="b.status"><span [style.width.%]="b.percent > 100 ? 100 : b.percent"></span></div><span class="xs muted">{{ b.percent | pct: false : 0 }}</span></td>
                  <td class="num">{{ b.spent | money }}</td>
                  <td class="num soft">{{ b.limit | money }}</td>
                  <td class="num" [class]="b.remaining | sign">{{ b.remaining | money }}</td>
                  <td class="num hide-sm" [class.debit]="b.projected > b.limit">{{ b.projected | money: 'round' }}</td>
                  <td class="row-actions"><button class="btn-icon" type="button" (click)="open(b)" aria-label="Modifier"><app-icon name="edit" size="16" /></button></td>
                </tr>
              } @empty {
                <tr><td colspan="7"><div class="empty">Aucun budget pour ce mois.</div></td></tr>
              }
            </tbody>
          </table>
        </div>
      </section>

      @if (suggestions().length) {
        <section class="sheet">
          <div class="sheet-head"><h3>Catégories sans enveloppe</h3><span class="small muted">Moyenne des 3 derniers mois</span></div>
          <div class="list">
            @for (s of suggestions(); track s.category_id) {
              <div class="list-item">
                <span class="dot" [style.background]="s.color"></span>
                <span class="grow">{{ s.name }}</span>
                <span class="num small soft">{{ s.average_3m | money: 'round' }} / mois</span>
                <button class="btn" type="button" (click)="quick(s.category_id!, s.average_3m!)">Créer à {{ roundUp(s.average_3m!) | money: 'round' }}</button>
              </div>
            }
          </div>
        </section>
      }
    </div>

    <app-modal [open]="!!draft()" [title]="draft()?.id ? 'Modifier le budget' : 'Nouveau budget'" (closed)="draft.set(null)">
      @if (draft(); as d) {
        <form class="form" (ngSubmit)="save()">
          <div class="row">
            <label class="field"><span>Catégorie</span>
              <select name="cat" required [ngModel]="d.category_id" (ngModelChange)="patch({ category_id: $event })">
                @for (c of store.expenseCategories(); track c.id) { <option [ngValue]="c.id">{{ c.name }}</option> }
              </select>
            </label>
            <label class="field"><span>Montant mensuel (€)</span><input type="number" step="1" min="1" name="amount" required [ngModel]="d.amount" (ngModelChange)="patch({ amount: $event })" /></label>
          </div>
          <div class="row">
            <label class="field"><span>Alerte à (% consommé)</span><input type="number" min="1" max="100" name="thr" [ngModel]="d.alert_threshold" (ngModelChange)="patch({ alert_threshold: $event })" /></label>
            <label class="check" style="align-self: end; padding-bottom: 8px"><input type="checkbox" name="ro" [ngModel]="d.rollover" (ngModelChange)="patch({ rollover: $event })" /> Reporter le reliquat</label>
          </div>
          <div class="row">
            <label class="field"><span>Début (optionnel)</span><input type="date" name="sd" [ngModel]="d.start_date" (ngModelChange)="patch({ start_date: $event || null })" /></label>
            <label class="field"><span>Fin (optionnel)</span><input type="date" name="ed" [ngModel]="d.end_date" (ngModelChange)="patch({ end_date: $event || null })" /></label>
          </div>
          <div class="form-actions">
            @if (d.id) { <button type="button" class="btn danger" (click)="remove()">Supprimer</button> }
            <span class="spacer"></span>
            <button type="button" class="btn" (click)="draft.set(null)">Annuler</button>
            <button type="submit" class="btn primary">Enregistrer</button>
          </div>
        </form>
      }
    </app-modal>
  `,
  styles: [`td .gauge{margin-bottom:2px}@media(max-width:640px){.hide-sm{display:none}}`],
})
export class BudgetsComponent {
  private api = inject(ApiService);
  private confirmDialog = inject(ConfirmService);
  private toast = inject(ToastService);
  store = inject(StoreService);
  month = signal(currentMonth());
  rows = signal<BudgetRow[]>([]);
  report = signal<MonthlyReport | null>(null);
  draft = signal<BudgetDraft | null>(null);
  label = computed(() => monthLabel(this.month(), 'long'));

  totals = computed(() => {
    const r = this.rows();
    const limit = r.reduce((s, b) => s + b.limit, 0);
    const spent = r.reduce((s, b) => s + b.spent, 0);
    return { limit, spent, pct: limit ? (spent / limit) * 100 : 0, over: r.filter((b) => b.status === 'over').length };
  });

  suggestions = computed(() => {
    const used = new Set(this.rows().map((b) => b.category_id));
    return (this.report()?.expenses_by_category ?? []).filter((c) => c.category_id && !used.has(c.category_id) && (c.average_3m ?? 0) >= 20 && !c.is_essential);
  });

  constructor() {
    this.store.load();
    effect(() => {
      this.store.version();
      this.month();
      untracked(() => this.load());
    });
  }

  load(): void {
    forkJoin({ rows: this.api.get<BudgetRow[]>('budgets', { month: this.month() }), report: this.api.get<MonthlyReport>('reports/monthly', { month: this.month() }) }).subscribe({
      next: ({ rows, report }) => {
        this.rows.set(rows);
        this.report.set(report);
      },
      error: (e) => this.toast.error(e),
    });
  }

  shift(d: number): void {
    this.month.set(shiftMonth(this.month(), d));
  }

  roundUp(v: number): number {
    return Math.ceil((v * 1.05) / 10) * 10;
  }

  open(b?: BudgetRow): void {
    this.draft.set(b ? { id: b.id, category_id: b.category_id, amount: b.amount, alert_threshold: b.alert_threshold, rollover: b.rollover, start_date: b.start_date, end_date: b.end_date } : { category_id: this.store.expenseCategories()[0]?.id ?? null, amount: null, alert_threshold: 80, rollover: false, start_date: null, end_date: null });
  }

  patch(p: Partial<BudgetDraft>): void {
    this.draft.update((d) => (d ? { ...d, ...p } : d));
  }

  quick(categoryId: number, avg: number): void {
    this.api.post('budgets', { category_id: categoryId, amount: this.roundUp(avg) }).subscribe({ next: () => { this.toast.show('Budget créé.'); this.load(); }, error: (e) => this.toast.error(e) });
  }

  save(): void {
    const d = this.draft();
    if (!d) return;
    const req = d.id ? this.api.put(`budgets/${d.id}`, d) : this.api.post('budgets', d);
    req.subscribe({ next: () => { this.toast.show('Budget enregistré.'); this.draft.set(null); this.load(); }, error: (e) => this.toast.error(e) });
  }

  async remove(): Promise<void> {
    const d = this.draft();
    if (!d?.id || !(await this.confirmDialog.ask('Supprimer ce budget ?'))) return;
    this.api.delete(`budgets/${d.id}`).subscribe({ next: () => { this.draft.set(null); this.load(); }, error: (e) => this.toast.error(e) });
  }
}
