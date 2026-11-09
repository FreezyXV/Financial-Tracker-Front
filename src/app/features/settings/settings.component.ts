import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { PALETTE } from '../../core/labels';
import { Category, Rule } from '../../core/models';
import { StoreService } from '../../core/store.service';
import { ToastService } from '../../core/toast.service';
import { IconComponent } from '../../shared/icon.component';
import { ModalComponent } from '../../shared/modal.component';

interface CatDraft {
  id?: number;
  name: string;
  type: 'income' | 'expense';
  color: string;
  parent_id: number | null;
  is_essential: boolean;
}

@Component({
  selector: 'app-settings',
  imports: [FormsModule, RouterLink, IconComponent, ModalComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <div class="page-head"><div><h1>Réglages</h1><p>Profil, objectifs d'épargne, catégories et règles de classement automatique.</p></div></div>

      <section class="sheet profile-card">
        <div>
          <h3>Profil financier</h3>
          <p class="small soft">{{ profileSummary() }}</p>
        </div>
        <a class="btn" routerLink="/onboarding">{{ hasProfile() ? 'Mettre à jour mes réponses' : 'Répondre au questionnaire' }}</a>
      </section>

      <section class="grid g-2">
        <article class="sheet">
          <div class="sheet-head"><h3>Profil et seuils</h3></div>
          <form class="form" (ngSubmit)="saveProfile()">
            <div class="row">
              <label class="field"><span>Nom</span><input name="name" [(ngModel)]="profile.name" /></label>
              <label class="field"><span>Email</span><input type="email" name="email" [(ngModel)]="profile.email" /></label>
            </div>
            <div class="row">
              <label class="field"><span>Objectif de taux d'épargne (%)</span><input type="number" min="0" max="100" name="sr" [(ngModel)]="profile.savings_rate_target" /></label>
              <label class="field"><span>Alerte dépense importante (€)</span><input type="number" min="0" name="lt" [(ngModel)]="profile.large_transaction_threshold" /><small>0 pour désactiver</small></label>
            </div>
            <div class="form-actions"><button class="btn primary" type="submit">Enregistrer</button></div>
          </form>
        </article>
        <article class="sheet">
          <div class="sheet-head"><h3>Mot de passe</h3></div>
          <form class="form" (ngSubmit)="savePassword()">
            <label class="field"><span>Mot de passe actuel</span><input type="password" name="cp" [(ngModel)]="pwd.current_password" autocomplete="current-password" /></label>
            <div class="row">
              <label class="field"><span>Nouveau</span><input type="password" name="np" minlength="8" [(ngModel)]="pwd.password" autocomplete="new-password" /></label>
              <label class="field"><span>Confirmation</span><input type="password" name="npc" [(ngModel)]="pwd.password_confirmation" autocomplete="new-password" /></label>
            </div>
            <div class="form-actions"><button class="btn" type="submit" [disabled]="!pwd.password">Changer</button></div>
          </form>
        </article>
      </section>

      <section class="grid g-2">
        <article class="sheet ledger">
          <div class="sheet-head"><h3>Catégories</h3><button class="btn" type="button" (click)="openCat()"><app-icon name="plus" size="14" /> Catégorie</button></div>
          @for (group of catGroups(); track group.label) {
            <h4 class="grp">{{ group.label }}</h4>
            <div class="list">
              @for (c of group.items; track c.id) {
                <div class="list-item small">
                  <span class="dot" [style.background]="c.color"></span>
                  <span class="grow">{{ c.parent_id ? '↳ ' : '' }}{{ c.name }} @if (c.is_essential) { <span class="tag">essentielle</span> }</span>
                  <span class="muted xs">{{ c.transactions_count ?? 0 }} op.</span>
                  <button class="btn-icon" type="button" (click)="openCat(c)" aria-label="Modifier"><app-icon name="edit" size="14" /></button>
                </div>
              }
            </div>
          }
        </article>

        <article class="sheet ledger">
          <div class="sheet-head"><h3>Règles de classement</h3><button class="link" type="button" (click)="applyRules()">Appliquer aux opérations à classer</button></div>
          <p class="xs muted">Si le libellé contient l'un des mots (séparés par « | »), la catégorie est attribuée. Les règles sont testées par priorité croissante, puis l'historique de vos corrections.</p>
          <form class="rule-new" (ngSubmit)="addRule()">
            <input name="pat" placeholder="ex. picard|grand frais" [(ngModel)]="newRule.pattern" required />
            <select name="rc" [(ngModel)]="newRule.category_id" required>
              @for (c of store.categories(); track c.id) { <option [ngValue]="c.id">{{ c.name }}</option> }
            </select>
            <button class="btn" type="submit">Ajouter</button>
          </form>
          <div class="list">
            @for (r of rules(); track r.id) {
              <div class="list-item small">
                <span class="dot" [style.background]="r.category?.color"></span>
                <div class="grow"><strong>{{ r.category?.name }}</strong><br /><code class="xs muted">{{ r.pattern }}</code></div>
                <button class="btn-icon" type="button" (click)="deleteRule(r)" aria-label="Supprimer la règle"><app-icon name="trash" size="14" /></button>
              </div>
            }
          </div>
        </article>
      </section>
      <section class="sheet danger-zone">
        <div>
          <h3>Supprimer mon compte</h3>
          <p class="small soft">Efface définitivement votre compte, vos comptes bancaires, opérations, placements, budgets et objectifs. Pensez à exporter vos opérations avant.</p>
        </div>
        <form class="toolbar" (ngSubmit)="deleteAccount()">
          <input type="password" name="delpwd" [(ngModel)]="deletePassword" placeholder="Mot de passe" autocomplete="current-password" aria-label="Mot de passe pour confirmer" />
          <button class="btn danger" type="submit" [disabled]="!deletePassword">Supprimer définitivement</button>
        </form>
      </section>
    </div>

    <app-modal [open]="!!cat()" [title]="cat()?.id ? 'Modifier la catégorie' : 'Nouvelle catégorie'" (closed)="cat.set(null)">
      @if (cat(); as c) {
        <form class="form" (ngSubmit)="saveCat()">
          <div class="row">
            <label class="field"><span>Nom</span><input name="n" required [ngModel]="c.name" (ngModelChange)="patchCat({ name: $event })" /></label>
            <label class="field"><span>Type</span>
              <select name="t" [ngModel]="c.type" (ngModelChange)="patchCat({ type: $event, parent_id: null })"><option value="expense">Dépense</option><option value="income">Revenu</option></select>
            </label>
          </div>
          <label class="field"><span>Catégorie parente</span>
            <select name="p" [ngModel]="c.parent_id" (ngModelChange)="patchCat({ parent_id: $event })">
              <option [ngValue]="null">Aucune</option>
              @for (x of parents(); track x.id) { @if (x.id !== c.id) { <option [ngValue]="x.id">{{ x.name }}</option> } }
            </select>
          </label>
          @if (c.type === 'expense') { <label class="check"><input type="checkbox" name="e" [ngModel]="c.is_essential" (ngModelChange)="patchCat({ is_essential: $event })" /> Dépense essentielle (besoins de la règle 50/30/20)</label> }
          <div class="field"><span>Couleur</span>
            <div class="swatches">@for (col of palette; track col) { <button type="button" class="sw" [style.background]="col" [class.on]="c.color === col" (click)="patchCat({ color: col })" [attr.aria-label]="'Couleur ' + col"></button> }</div>
          </div>
          <div class="form-actions">
            @if (c.id) { <button type="button" class="btn danger" (click)="deleteCat()">Supprimer</button> }
            <span class="spacer"></span>
            <button type="button" class="btn" (click)="cat.set(null)">Annuler</button>
            <button type="submit" class="btn primary">Enregistrer</button>
          </div>
        </form>
      }
    </app-modal>
  `,
  styles: [`.danger-zone{display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap;border-color:color-mix(in srgb,var(--debit) 40%,var(--rule))}
    .danger-zone h3{color:var(--debit)}.danger-zone p{max-width:60ch}
    .profile-card{display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap}
    .grp{font-size:var(--fs-xs);color:var(--ink-3);font-weight:500;margin:var(--sp-3) 0 0}
    .rule-new{display:grid;grid-template-columns:1fr 160px auto;gap:6px;margin:var(--sp-3) 0}
    @media(max-width:560px){.rule-new{grid-template-columns:1fr}}
    code{font-family:var(--mono);word-break:break-word}
    .swatches{display:flex;gap:6px;flex-wrap:wrap}
    .sw{width:24px;height:24px;border-radius:50%;border:2px solid var(--sheet);outline:1px solid var(--rule-strong);cursor:pointer}.sw.on{outline:2px solid var(--ink)}`],
})
export class SettingsComponent implements OnInit {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private toast = inject(ToastService);
  store = inject(StoreService);
  palette = [...PALETTE, '#c25450', '#2b3f66', '#7a5ca8', '#b8913f'];
  profile = { name: '', email: '', savings_rate_target: 20, large_transaction_threshold: 500 };
  pwd = { current_password: '', password: '', password_confirmation: '' };
  rules = signal<Rule[]>([]);
  deletePassword = '';
  newRule: { pattern: string; category_id: number | null } = { pattern: '', category_id: null };
  cat = signal<CatDraft | null>(null);

  hasProfile = computed(() => !!this.auth.user()?.profile && !this.auth.user()?.profile?.skipped);
  profileSummary = computed(() => {
    const p = this.auth.user()?.profile;
    if (!p || p.skipped) return 'Non renseigné : les conseils et budgets ne sont pas encore adaptés à votre situation.';
    const labels: Record<string, string> = {
      cdi: 'CDI', cdd: 'CDD', freelance: 'Indépendant', business_owner: 'Dirigeant', civil_servant: 'Fonctionnaire',
      student: 'Étudiant', unemployed: 'En recherche', retired: 'Retraité', prudent: 'prudent', balanced: 'équilibré', dynamic: 'dynamique',
      tenant: 'locataire', owner_mortgage: 'propriétaire avec crédit', owner: 'propriétaire', hosted: 'hébergé',
    };
    const parts = [
      p.birth_year ? `${new Date().getFullYear() - p.birth_year} ans` : null,
      p.employment ? labels[p.employment] : null,
      p.housing ? labels[p.housing] : null,
      p.monthly_income ? `${Math.round(p.monthly_income).toLocaleString('fr-FR')} €/mois` : null,
      p.risk ? `profil ${labels[p.risk]}` : null,
      p.goals?.length ? `${p.goals.length} objectif(s)` : null,
    ];
    return parts.filter(Boolean).join(' · ');
  });

  catGroups = computed(() => {
    const all = this.store.categories();
    const order = (list: Category[]) => list.filter((c) => !c.parent_id).flatMap((p) => [p, ...list.filter((c) => c.parent_id === p.id)]);
    return [
      { label: 'Dépenses', items: order(all.filter((c) => c.type === 'expense')) },
      { label: 'Revenus', items: order(all.filter((c) => c.type === 'income')) },
    ];
  });
  parents = computed(() => this.store.categories().filter((c) => !c.parent_id && c.type === this.cat()?.type));

  ngOnInit(): void {
    this.store.load(true);
    this.api.get<{ name: string; email: string; savings_rate_target: number; large_transaction_threshold: number }>('me').subscribe((u) => {
      this.profile = { name: u.name, email: u.email, savings_rate_target: u.savings_rate_target, large_transaction_threshold: u.large_transaction_threshold };
    });
    this.loadRules();
  }

  loadRules(): void {
    this.api.get<Rule[]>('rules').subscribe((r) => this.rules.set(r));
  }

  saveProfile(): void {
    this.auth.updateProfile(this.profile).subscribe({ next: () => this.toast.show('Profil enregistré.'), error: (e) => this.toast.error(e) });
  }

  savePassword(): void {
    this.auth.updateProfile(this.pwd).subscribe({
      next: () => {
        this.toast.show('Mot de passe modifié.');
        this.pwd = { current_password: '', password: '', password_confirmation: '' };
      },
      error: (e) => this.toast.error(e),
    });
  }

  deleteAccount(): void {
    if (!confirm('Supprimer définitivement votre compte et toutes vos données ? Cette action est irréversible.')) return;
    this.api.deleteWithBody('me', { password: this.deletePassword }).subscribe({
      next: () => {
        this.auth.clear();
        this.toast.show('Compte supprimé.');
        location.href = '/register';
      },
      error: (e) => this.toast.error(e, 'Mot de passe incorrect.'),
    });
  }

  addRule(): void {
    if (!this.newRule.pattern || !this.newRule.category_id) return;
    this.api.post('rules', { ...this.newRule, priority: 5 }).subscribe({
      next: () => {
        this.newRule = { pattern: '', category_id: null };
        this.loadRules();
      },
      error: (e) => this.toast.error(e),
    });
  }

  deleteRule(r: Rule): void {
    this.api.delete(`rules/${r.id}`).subscribe(() => this.loadRules());
  }

  applyRules(): void {
    this.api.post<{ categorized: number }>('rules/apply').subscribe({ next: (r) => { this.toast.show(`${r.categorized} opération(s) classée(s).`); this.store.changed(); }, error: (e) => this.toast.error(e) });
  }

  openCat(c?: Category): void {
    this.cat.set(c ? { id: c.id, name: c.name, type: c.type, color: c.color, parent_id: c.parent_id, is_essential: c.is_essential } : { name: '', type: 'expense', color: PALETTE[0], parent_id: null, is_essential: false });
  }

  patchCat(p: Partial<CatDraft>): void {
    this.cat.update((c) => (c ? { ...c, ...p } : c));
  }

  saveCat(): void {
    const c = this.cat();
    if (!c) return;
    const req = c.id ? this.api.put(`categories/${c.id}`, c) : this.api.post('categories', c);
    req.subscribe({ next: () => { this.cat.set(null); this.store.changed(); }, error: (e) => this.toast.error(e) });
  }

  deleteCat(): void {
    const c = this.cat();
    if (!c?.id || !confirm(`Supprimer « ${c.name} » ? Les opérations associées deviendront « à classer ».`)) return;
    this.api.delete(`categories/${c.id}`).subscribe({ next: () => { this.cat.set(null); this.store.changed(); }, error: (e) => this.toast.error(e) });
  }
}
