import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { AlertItem } from '../core/models';
import { StoreService } from '../core/store.service';
import { TransactionFormComponent } from '../features/transactions/transaction-form.component';
import { IconComponent } from '../shared/icon.component';
import { ModalComponent } from '../shared/modal.component';
import { FrDatePipe } from '../shared/pipes';

interface NavItem {
  path: string;
  label: string;
  icon: string;
  exact?: boolean;
}

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, IconComponent, ModalComponent, TransactionFormComponent, FrDatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './shell.component.scss',
  template: `
    <div class="shell" [class.nav-open]="navOpen()">
      <aside class="side">
        <a routerLink="/" class="brand" (click)="navOpen.set(false)">
          <span class="brand-mark" aria-hidden="true"></span>
          <span>Registre</span>
        </a>
        <nav>
          @for (n of nav; track n.path) {
            <a [routerLink]="n.path" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: !!n.exact }" (click)="navOpen.set(false)">
              <app-icon [name]="n.icon" /> {{ n.label }}
            </a>
          }
        </nav>
        <div class="side-foot">
          <button class="side-btn" type="button" (click)="toggleTheme()"><app-icon [name]="theme() === 'dark' ? 'sun' : 'moon'" /> {{ theme() === 'dark' ? 'Thème clair' : 'Thème sombre' }}</button>
          <button class="side-btn" type="button" (click)="auth.logout()"><app-icon name="logout" /> Déconnexion</button>
          <p class="who">{{ auth.user()?.name }}<br /><span>{{ auth.user()?.email }}</span></p>
        </div>
      </aside>
      <div class="scrim" (click)="navOpen.set(false)"></div>

      <div class="main">
        <header class="top">
          <button class="btn-icon menu" type="button" (click)="navOpen.set(true)" aria-label="Menu"><app-icon name="menu" /></button>
          <span class="top-title">{{ today }}</span>
          <div class="top-actions">
            <div class="bell-wrap">
              <button class="btn-icon" type="button" (click)="toggleAlerts()" aria-label="Alertes">
                <app-icon name="bell" />
                @if (unread() > 0) { <span class="badge">{{ unread() }}</span> }
              </button>
              @if (alertsOpen()) {
                <div class="alerts-panel">
                  <div class="alerts-head"><strong>Alertes</strong>
                    @if (unread() > 0) { <button class="link" type="button" (click)="readAll()">Tout marquer lu</button> }
                  </div>
                  @for (a of alerts(); track a.id) {
                    <div class="alert-row" [class.unread]="!a.is_read" [attr.data-level]="a.level">
                      <p>{{ a.message }}</p>
                      <span class="xs muted">{{ a.created_at | frDate }}</span>
                    </div>
                  } @empty {
                    <p class="empty">Aucune alerte.</p>
                  }
                </div>
              }
            </div>
            <button class="btn primary" type="button" (click)="quickAdd.set(true)"><app-icon name="plus" size="16" /> <span class="hide-sm">Opération</span></button>
          </div>
        </header>
        <router-outlet />
      </div>

      <nav class="bottom-nav" aria-label="Navigation rapide">
        @for (n of mobileNav; track n.path) {
          <a [routerLink]="n.path" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: !!n.exact }"><app-icon [name]="n.icon" size="20" /><span>{{ n.label }}</span></a>
        }
      </nav>
    </div>

    <app-modal [open]="quickAdd()" title="Nouvelle opération" (closed)="quickAdd.set(false)">
      @if (quickAdd()) { <app-transaction-form (saved)="quickAdd.set(false)" (closed)="quickAdd.set(false)" /> }
    </app-modal>
  `,
})
export class ShellComponent implements OnInit {
  auth = inject(AuthService);
  private api = inject(ApiService);
  private store = inject(StoreService);
  private router = inject(Router);

  navOpen = signal(false);
  quickAdd = signal(false);
  alertsOpen = signal(false);
  alerts = signal<AlertItem[]>([]);
  unread = signal(0);
  theme = signal<'light' | 'dark'>(this.initialTheme());
  today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  nav: NavItem[] = [
    { path: '/', label: 'Synthèse', icon: 'dashboard', exact: true },
    { path: '/transactions', label: 'Opérations', icon: 'list' },
    { path: '/accounts', label: 'Comptes', icon: 'wallet' },
    { path: '/budgets', label: 'Budgets', icon: 'pie' },
    { path: '/investments', label: 'Placements', icon: 'chart' },
    { path: '/reports', label: 'Bilans', icon: 'report' },
    { path: '/goals', label: 'Objectifs', icon: 'target' },
    { path: '/recurring', label: 'Échéances', icon: 'repeat' },
    { path: '/simulator', label: 'Projection', icon: 'compass' },
    { path: '/settings', label: 'Réglages', icon: 'settings' },
  ];
  mobileNav = this.nav.filter((n) => ['/', '/transactions', '/investments', '/reports', '/budgets'].includes(n.path));

  ngOnInit(): void {
    this.auth.loadMe();
    this.store.load();
    this.applyTheme();
    this.loadAlerts();
    this.router.events.pipe(filter((e) => e instanceof NavigationEnd)).subscribe(() => this.alertsOpen.set(false));
  }

  private initialTheme(): 'light' | 'dark' {
    try {
      const saved = localStorage.getItem('ft_theme');
      if (saved === 'light' || saved === 'dark') return saved;
    } catch {
      /* ignore */
    }
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  private applyTheme(): void {
    document.documentElement.setAttribute('data-theme', this.theme());
  }

  toggleTheme(): void {
    this.theme.set(this.theme() === 'dark' ? 'light' : 'dark');
    try {
      localStorage.setItem('ft_theme', this.theme());
    } catch {
      /* ignore */
    }
    this.applyTheme();
    this.store.version.update((v) => v + 1); // redessine les graphiques
  }

  loadAlerts(): void {
    this.api.get<AlertItem[]>('alerts').subscribe((a) => {
      this.alerts.set(a.slice(0, 20));
      this.unread.set(a.filter((x) => !x.is_read).length);
    });
  }

  toggleAlerts(): void {
    this.alertsOpen.update((v) => !v);
    if (this.alertsOpen()) this.loadAlerts();
  }

  readAll(): void {
    this.api.post('alerts/read-all').subscribe(() => this.loadAlerts());
  }
}
