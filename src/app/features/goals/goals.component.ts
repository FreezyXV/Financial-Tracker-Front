import { ChangeDetectionStrategy, Component, effect, inject, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { PALETTE } from '../../core/labels';
import { Goal } from '../../core/models';
import { StoreService } from '../../core/store.service';
import { ToastService } from '../../core/toast.service';
import { IconComponent } from '../../shared/icon.component';
import { ModalComponent } from '../../shared/modal.component';
import { PIPES } from '../../shared/pipes';
import { monthlyNeeded } from '../../shared/projection';

interface GoalDraft {
  id?: number;
  name: string;
  target_amount: number | null;
  current_amount: number;
  target_date: string | null;
  account_id: number | null;
  color: string;
  priority: number;
}

@Component({
  selector: 'app-goals',
  imports: [FormsModule, IconComponent, ModalComponent, ...PIPES],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <div class="page-head">
        <div>
          <h1>Objectifs</h1>
          <p>Épargne de précaution, apport immobilier, projet. Liez un objectif à un compte pour que sa progression se mette à jour seule.</p>
        </div>
        <button class="btn primary" type="button" (click)="open()"><app-icon name="plus" size="16" /> Nouvel objectif</button>
      </div>
      <section class="goals">
        @for (g of goals(); track g.id) {
          <article class="sheet goal">
            <div class="goal-head">
              <div><h3>{{ g.name }}</h3><span class="xs muted">Priorité {{ g.priority }}@if (g.account_id) { · suivi sur {{ accountName(g.account_id) }} }</span></div>
              <button class="btn-icon" type="button" (click)="open(g)" aria-label="Modifier"><app-icon name="edit" size="16" /></button>
            </div>
            <div class="ring" [style.--p]="g.percent" [style.--c]="g.color"><span class="num">{{ g.percent | pct: false : 0 }}</span></div>
            <div class="goal-figs">
              <div class="figure"><span class="label">Atteint</span><span class="value">{{ g.current | money: 'round' }}</span></div>
              <div class="figure"><span class="label">Cible</span><span class="value soft">{{ g.target_amount | money: 'round' }}</span></div>
            </div>
            @if (g.reached) {
              <span class="tag good">Objectif atteint</span>
            } @else if (g.target_date) {
              <p class="small">Encore <strong class="num">{{ g.remaining | money: 'round' }}</strong> d'ici le {{ g.target_date | frDate: 'long' }} : <strong class="num">{{ g.monthly_needed | money: 'round' }}</strong> par mois
                <span class="muted">(ou {{ withReturn(g) | money: 'round' }} placés à 5 %/an)</span></p>
            } @else {
              <p class="small">Reste <strong class="num">{{ g.remaining | money: 'round' }}</strong>. Ajoutez une échéance pour connaître l'effort mensuel.</p>
            }
          </article>
        } @empty {
          <div class="sheet empty">Aucun objectif pour l'instant. Un bon premier objectif : 3 à 6 mois de dépenses en épargne de précaution.</div>
        }
      </section>
    </div>

    <app-modal [open]="!!draft()" [title]="draft()?.id ? 'Modifier l’objectif' : 'Nouvel objectif'" (closed)="draft.set(null)">
      @if (draft(); as d) {
        <form class="form" (ngSubmit)="save()">
          <label class="field"><span>Nom</span><input name="name" required [ngModel]="d.name" (ngModelChange)="patch({ name: $event })" placeholder="Apport immobilier, voyage, voiture…" /></label>
          <div class="row">
            <label class="field"><span>Montant cible (€)</span><input type="number" min="1" name="t" required [ngModel]="d.target_amount" (ngModelChange)="patch({ target_amount: $event })" /></label>
            <label class="field"><span>Échéance</span><input type="date" name="td" [ngModel]="d.target_date" (ngModelChange)="patch({ target_date: $event || null })" /></label>
          </div>
          <div class="row">
            <label class="field"><span>Compte suivi</span>
              <select name="acc" [ngModel]="d.account_id" (ngModelChange)="patch({ account_id: $event })">
                <option [ngValue]="null">Aucun (montant manuel)</option>
                @for (a of store.activeAccounts(); track a.id) { <option [ngValue]="a.id">{{ a.name }}</option> }
              </select>
            </label>
            @if (!d.account_id) {
              <label class="field"><span>Déjà épargné (€)</span><input type="number" min="0" name="c" [ngModel]="d.current_amount" (ngModelChange)="patch({ current_amount: $event })" /></label>
            } @else {
              <label class="field"><span>Priorité</span><input type="number" min="1" max="5" name="p2" [ngModel]="d.priority" (ngModelChange)="patch({ priority: $event })" /></label>
            }
          </div>
          @if (!d.account_id) { <label class="field"><span>Priorité (1 = haute)</span><input type="number" min="1" max="5" name="p" [ngModel]="d.priority" (ngModelChange)="patch({ priority: $event })" /></label> }
          <div class="field"><span>Couleur</span>
            <div class="swatches">@for (c of palette; track c) { <button type="button" class="sw" [style.background]="c" [class.on]="d.color === c" (click)="patch({ color: c })" [attr.aria-label]="'Couleur ' + c"></button> }</div>
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
  styles: [`.goals{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:var(--sp-4)}
    .goal{display:grid;gap:var(--sp-3);align-content:start}
    .goal-head{display:flex;justify-content:space-between;gap:8px}
    .goal-figs{display:flex;gap:var(--sp-5)}
    .ring{--p:0;--c:var(--ink);width:96px;height:96px;border-radius:50%;display:grid;place-items:center;
      background:conic-gradient(var(--c) calc(var(--p) * 1%),var(--sheet-2) 0);position:relative}
    .ring::before{content:'';position:absolute;inset:9px;border-radius:50%;background:var(--sheet)}
    .ring span{position:relative;font-size:var(--fs-lg)}
    .swatches{display:flex;gap:6px;flex-wrap:wrap}
    .sw{width:24px;height:24px;border-radius:50%;border:2px solid var(--sheet);outline:1px solid var(--rule-strong);cursor:pointer}
    .sw.on{outline:2px solid var(--ink)}`],
})
export class GoalsComponent {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  store = inject(StoreService);
  goals = signal<Goal[]>([]);
  draft = signal<GoalDraft | null>(null);
  palette = PALETTE;

  constructor() {
    this.store.load();
    effect(() => {
      this.store.version();
      untracked(() => this.load());
    });
  }

  load(): void {
    this.api.get<Goal[]>('goals').subscribe((g) => this.goals.set(g));
  }

  accountName(id: number): string {
    return this.store.accounts().find((a) => a.id === id)?.name ?? '';
  }

  withReturn(g: Goal): number {
    return monthlyNeeded(g.target_amount, g.current, g.months_left ?? 0, 5);
  }

  open(g?: Goal): void {
    this.draft.set(g ? { id: g.id, name: g.name, target_amount: g.target_amount, current_amount: g.current_amount, target_date: g.target_date, account_id: g.account_id, color: g.color, priority: g.priority } : { name: '', target_amount: null, current_amount: 0, target_date: null, account_id: null, color: PALETTE[1], priority: 2 });
  }

  patch(p: Partial<GoalDraft>): void {
    this.draft.update((d) => (d ? { ...d, ...p } : d));
  }

  save(): void {
    const d = this.draft();
    if (!d) return;
    const req = d.id ? this.api.put(`goals/${d.id}`, d) : this.api.post('goals', d);
    req.subscribe({ next: () => { this.draft.set(null); this.toast.show('Objectif enregistré.'); this.load(); }, error: (e) => this.toast.error(e) });
  }

  remove(): void {
    const d = this.draft();
    if (!d?.id || !confirm('Supprimer cet objectif ?')) return;
    this.api.delete(`goals/${d.id}`).subscribe({ next: () => { this.draft.set(null); this.load(); }, error: (e) => this.toast.error(e) });
  }
}
