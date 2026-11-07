import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/auth.guard';

export const routes: Routes = [
  { path: 'login', canActivate: [guestGuard], loadComponent: () => import('./features/auth/login/login.component').then((m) => m.LoginComponent), title: 'Connexion — Registre' },
  { path: 'register', canActivate: [guestGuard], loadComponent: () => import('./features/auth/register/register.component').then((m) => m.RegisterComponent), title: 'Créer un compte — Registre' },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/shell.component').then((m) => m.ShellComponent),
    children: [
      { path: '', pathMatch: 'full', loadComponent: () => import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent), title: 'Synthèse — Registre' },
      { path: 'transactions', loadComponent: () => import('./features/transactions/transactions.component').then((m) => m.TransactionsComponent), title: 'Opérations — Registre' },
      { path: 'accounts', loadComponent: () => import('./features/accounts/accounts.component').then((m) => m.AccountsComponent), title: 'Comptes — Registre' },
      { path: 'budgets', loadComponent: () => import('./features/budgets/budgets.component').then((m) => m.BudgetsComponent), title: 'Budgets — Registre' },
      { path: 'investments', loadComponent: () => import('./features/investments/investments.component').then((m) => m.InvestmentsComponent), title: 'Placements — Registre' },
      { path: 'reports', loadComponent: () => import('./features/reports/reports.component').then((m) => m.ReportsComponent), title: 'Bilans — Registre' },
      { path: 'goals', loadComponent: () => import('./features/goals/goals.component').then((m) => m.GoalsComponent), title: 'Objectifs — Registre' },
      { path: 'recurring', loadComponent: () => import('./features/recurring/recurring.component').then((m) => m.RecurringComponent), title: 'Échéances — Registre' },
      { path: 'simulator', loadComponent: () => import('./features/simulator/simulator.component').then((m) => m.SimulatorComponent), title: 'Projection — Registre' },
      { path: 'settings', loadComponent: () => import('./features/settings/settings.component').then((m) => m.SettingsComponent), title: 'Réglages — Registre' },
    ],
  },
  { path: '**', redirectTo: '' },
];
