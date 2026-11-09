import { ChangeDetectionStrategy, Component, OnInit, computed, effect, inject, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { ACCOUNT_TYPES } from '../../core/labels';
import { FinancialProfile, Recommendation, User } from '../../core/models';
import { StoreService } from '../../core/store.service';
import { ToastService } from '../../core/toast.service';
import { IconComponent } from '../../shared/icon.component';
import { navigateTo } from '../../shared/nav';
import { PIPES } from '../../shared/pipes';

interface Choice<T extends string = string> {
  value: T;
  label: string;
  hint?: string;
}

interface AccountAnswer {
  type: string;
  selected: boolean;
  existing: boolean;
  name: string;
  institution: string;
  balance: number | null;
  opened_year: number | null;
  interest_rate: number | null;
}

interface Preview {
  emergency_months: number;
  emergency_target: number;
  estimated_expenses: number;
  estimated_savings: number;
  tax_parts: number;
  tmi: number | null;
}

interface Created {
  accounts: number;
  categories: number;
  recurring: number;
  goals: number;
  budgets: number;
}

const FR_ONLY = ['livret_a', 'ldds', 'lep', 'pel', 'pea', 'pea_pme', 'per', 'assurance_vie'];
const ACCOUNT_ORDER = ['checking', 'livret_a', 'ldds', 'lep', 'savings', 'pel', 'pea', 'cto', 'assurance_vie', 'per', 'crypto', 'real_estate', 'loan', 'cash'];
const NEEDS_YEAR = ['pea', 'pea_pme', 'assurance_vie', 'per'];

@Component({
  selector: 'app-onboarding',
  imports: [FormsModule, IconComponent, ...PIPES],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './onboarding.component.html',
  styleUrl: './onboarding.component.scss',
})
export class OnboardingComponent implements OnInit {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private router = inject(Router);
  private toast = inject(ToastService);
  private store = inject(StoreService);

  readonly steps = ['Vous', 'Travail et logement', 'Budget mensuel', 'Vos comptes', 'Vos objectifs', 'Profil investisseur', 'Récapitulatif'];
  step = signal(0);
  busy = signal(false);
  rerun = signal(false);
  firstName = computed(() => (this.auth.user()?.name ?? '').split(' ')[0]);

  p = signal<FinancialProfile>({
    country: 'FR', household: 'single', children: 0, has_pets: false, goals: ['emergency'],
    income_variable: false, payday: 1, experience: 'beginner', risk: 'balanced', horizon: 'long', budget_method: '50_30_20',
  });
  accounts = signal<AccountAnswer[]>([]);
  options = signal({ create_budgets: true, create_recurring: true, create_goals: true });
  preview = signal<Preview | null>(null);
  created = signal<Created | null>(null);
  recommendations = signal<Recommendation[]>([]);
  private previewTimer?: ReturnType<typeof setTimeout>;

  readonly countries: Choice<NonNullable<FinancialProfile['country']>>[] = [
    { value: 'FR', label: 'France' }, { value: 'LU', label: 'Luxembourg' }, { value: 'BE', label: 'Belgique' },
    { value: 'CH', label: 'Suisse' }, { value: 'DE', label: 'Allemagne' }, { value: 'other', label: 'Autre pays' },
  ];
  readonly households: Choice<NonNullable<FinancialProfile['household']>>[] = [
    { value: 'single', label: 'Seul·e', hint: 'Budget individuel' },
    { value: 'couple', label: 'En couple', hint: 'Finances du foyer' },
    { value: 'family', label: 'Famille', hint: 'Avec enfants à charge' },
  ];
  readonly employments: Choice<NonNullable<FinancialProfile['employment']>>[] = [
    { value: 'cdi', label: 'Salarié·e en CDI' }, { value: 'civil_servant', label: 'Fonctionnaire' },
    { value: 'cdd', label: 'CDD, intérim' }, { value: 'freelance', label: 'Indépendant·e, freelance', hint: 'Micro-entreprise, portage, consultant' },
    { value: 'business_owner', label: 'Dirigeant·e d’entreprise' }, { value: 'student', label: 'Étudiant·e, alternant·e' },
    { value: 'unemployed', label: 'En recherche d’emploi' }, { value: 'retired', label: 'Retraité·e' },
  ];
  readonly housings: Choice<NonNullable<FinancialProfile['housing']>>[] = [
    { value: 'tenant', label: 'Locataire' }, { value: 'owner_mortgage', label: 'Propriétaire avec crédit' },
    { value: 'owner', label: 'Propriétaire sans crédit' }, { value: 'hosted', label: 'Hébergé·e', hint: 'Famille, amis, logement de fonction' },
  ];
  readonly goalChoices: Choice[] = [
    { value: 'emergency', label: 'Me constituer une épargne de sécurité', hint: 'Faire face à un imprévu sans s’endetter' },
    { value: 'budget', label: 'Maîtriser mon budget', hint: 'Savoir où part l’argent chaque mois' },
    { value: 'debt', label: 'Rembourser mes dettes', hint: 'Crédit conso, prêt auto, découvert' },
    { value: 'home', label: 'Acheter ma résidence principale', hint: 'Constituer un apport' },
    { value: 'invest', label: 'Investir en bourse', hint: 'ETF, actions, PEA' },
    { value: 'retirement', label: 'Préparer ma retraite' },
    { value: 'fire', label: 'Devenir financièrement indépendant', hint: 'Vivre de ses placements' },
    { value: 'project', label: 'Financer un projet', hint: 'Voyage, voiture, mariage, études…' },
    { value: 'expat', label: 'Partir vivre à l’étranger' },
  ];
  readonly experiences: Choice<NonNullable<FinancialProfile['experience']>>[] = [
    { value: 'none', label: 'Jamais investi', hint: 'Uniquement comptes et livrets' },
    { value: 'beginner', label: 'Débutant·e', hint: 'Quelques ETF ou une assurance-vie' },
    { value: 'intermediate', label: 'Intermédiaire', hint: 'PEA ou compte-titres suivis régulièrement' },
    { value: 'advanced', label: 'Confirmé·e', hint: 'Actions en direct, crypto, plusieurs enveloppes' },
  ];
  readonly risks: Choice<NonNullable<FinancialProfile['risk']>>[] = [
    { value: 'prudent', label: 'Prudent', hint: 'Une baisse de 10 % m’inquiète : je préfère la stabilité.' },
    { value: 'balanced', label: 'Équilibré', hint: 'J’accepte une baisse de 20 % en attendant que ça remonte.' },
    { value: 'dynamic', label: 'Dynamique', hint: 'Une baisse de 35 % est une occasion d’acheter.' },
  ];
  readonly horizons: Choice<NonNullable<FinancialProfile['horizon']>>[] = [
    { value: 'short', label: 'Moins de 3 ans' }, { value: 'medium', label: '3 à 8 ans' }, { value: 'long', label: 'Plus de 8 ans' },
  ];
  readonly budgetMethods: Choice<NonNullable<FinancialProfile['budget_method']>>[] = [
    { value: '50_30_20', label: 'Règle 50 / 30 / 20', hint: 'Besoins, envies, épargne : des enveloppes calibrées sur vos revenus' },
    { value: 'envelopes', label: 'Enveloppes détaillées', hint: 'Je fixe moi-même chaque poste' },
    { value: 'none', label: 'Pas de budget', hint: 'Juste le suivi des dépenses' },
  ];

  isFrance = computed(() => this.p().country === 'FR');
  visibleAccounts = computed(() => this.accounts().filter((a) => this.isFrance() || !FR_ONLY.includes(a.type)));
  selectedAccounts = computed(() => this.visibleAccounts().filter((a) => a.selected));
  age = computed(() => (this.p().birth_year ? new Date().getFullYear() - (this.p().birth_year ?? 0) : null));
  fixedTotal = computed(() => (this.p().housing_cost ?? 0) + (this.p().other_fixed_costs ?? 0) + (this.p().variable_spending ?? 0));
  remaining = computed(() => (this.p().monthly_income ?? 0) - this.fixedTotal());
  netWorth = computed(() => this.selectedAccounts().filter((a) => !a.existing).reduce((s, a) => s + (a.type === 'loan' ? -Math.abs(a.balance ?? 0) : a.balance ?? 0), 0));
  progress = computed(() => ((this.step() + 1) / this.steps.length) * 100);
  hasGoal = (g: string) => (this.p().goals ?? []).includes(g);

  constructor() {
    // Aperçu chiffré (coussin, TMI) recalculé côté API à chaque changement
    effect(() => {
      const profile = this.p();
      untracked(() => {
        clearTimeout(this.previewTimer);
        this.previewTimer = setTimeout(() => this.api.post<Preview>('onboarding/preview', { profile: this.clean(profile) }).subscribe({ next: (r) => this.preview.set(r), error: () => undefined }), 350);
      });
    });
  }

  ngOnInit(): void {
    this.accounts.set(ACCOUNT_ORDER.map((type) => ({ type, selected: type === 'checking', existing: false, name: '', institution: '', balance: null, opened_year: null, interest_rate: null })));
    this.api.get<{ profile: FinancialProfile | null; onboarded_at: string | null; accounts: { type: string; name: string }[] }>('onboarding').subscribe((r) => {
      if (r.profile && !r.profile.skipped) {
        this.rerun.set(true);
        this.p.update((p) => ({ ...p, ...r.profile }));
      }
      const owned = new Set(r.accounts.map((a) => a.type));
      this.accounts.update((list) => list.map((a) => (owned.has(a.type) ? { ...a, selected: true, existing: true, name: r.accounts.find((x) => x.type === a.type)?.name ?? '' } : a)));
    });
  }

  label(type: string): string {
    return ACCOUNT_TYPES[type]?.label ?? type;
  }

  hint(type: string): string | undefined {
    return ACCOUNT_TYPES[type]?.hint;
  }

  needsYear(type: string): boolean {
    return NEEDS_YEAR.includes(type);
  }

  set<K extends keyof FinancialProfile>(key: K, value: FinancialProfile[K]): void {
    this.p.update((p) => {
      const next = { ...p, [key]: value };
      if (key === 'household' && value === 'family' && !(p.children ?? 0)) next.children = 1;
      if (key === 'household' && value !== 'family') next.children = value === 'single' ? 0 : p.children;
      return next;
    });
  }

  setOption(key: 'create_budgets' | 'create_recurring' | 'create_goals', value: boolean): void {
    this.options.update((o) => ({ ...o, [key]: value }));
  }

  toggleGoal(g: string): void {
    const goals = new Set(this.p().goals ?? []);
    goals.has(g) ? goals.delete(g) : goals.add(g);
    this.set('goals', [...goals]);
  }

  toggleAccount(type: string): void {
    this.accounts.update((list) => list.map((a) => (a.type === type && !a.existing ? { ...a, selected: !a.selected } : a)));
  }

  patchAccount(type: string, patch: Partial<AccountAnswer>): void {
    this.accounts.update((list) => list.map((a) => (a.type === type ? { ...a, ...patch } : a)));
  }

  choiceLabel<T extends string>(list: Choice<T>[], v: T | undefined): string {
    return list.find((c) => c.value === v)?.label ?? '—';
  }

  goalLabel(g: string): string {
    return this.goalChoices.find((c) => c.value === g)?.label ?? g;
  }

  next(): void {
    this.step.update((s) => Math.min(this.steps.length - 1, s + 1));
    window.scrollTo({ top: 0 });
  }

  prev(): void {
    this.step.update((s) => Math.max(0, s - 1));
  }

  private clean(p: FinancialProfile): FinancialProfile {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(p)) if (v !== null && v !== undefined && v !== '' && k !== 'skipped') out[k] = v;
    return out as FinancialProfile;
  }

  finish(): void {
    this.busy.set(true);
    const accounts = this.selectedAccounts()
      .filter((a) => !a.existing)
      .map((a) => ({ type: a.type, name: a.name || null, institution: a.institution || null, balance: a.balance ?? 0, opened_year: a.opened_year || null, interest_rate: a.interest_rate || null }));
    this.api.post<{ user: User; created: Created; recommendations: Recommendation[] }>('onboarding', { profile: this.clean(this.p()), accounts, options: this.options() }).subscribe({
      next: (r) => {
        this.auth.user.set(r.user);
        this.created.set(r.created);
        this.recommendations.set(r.recommendations);
        this.store.changed();
        this.busy.set(false);
      },
      error: (e) => {
        this.busy.set(false);
        this.toast.error(e, 'Enregistrement impossible.');
      },
    });
  }

  skip(): void {
    this.api.post<User>('onboarding/skip').subscribe((u) => {
      this.auth.user.set(u);
      this.router.navigate(['/']);
    });
  }

  go(route: string): void {
    navigateTo(this.router, route);
  }
}
