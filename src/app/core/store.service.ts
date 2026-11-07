import { Injectable, computed, inject, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import { ApiService } from './api.service';
import { Account, Category } from './models';

/** Référentiels partagés (comptes, catégories) + signal de rafraîchissement global. */
@Injectable({ providedIn: 'root' })
export class StoreService {
  private api = inject(ApiService);

  readonly accounts = signal<Account[]>([]);
  readonly categories = signal<Category[]>([]);
  readonly loaded = signal(false);
  /** Incrémenté à chaque modification de données : les pages s'y abonnent pour se recharger. */
  readonly version = signal(0);

  readonly activeAccounts = computed(() => this.accounts().filter((a) => !a.is_archived));
  readonly expenseCategories = computed(() => this.categories().filter((c) => c.type === 'expense'));
  readonly incomeCategories = computed(() => this.categories().filter((c) => c.type === 'income'));

  load(force = false): void {
    if (this.loaded() && !force) return;
    forkJoin({
      accounts: this.api.get<Account[]>('accounts'),
      categories: this.api.get<Category[]>('categories'),
    }).subscribe(({ accounts, categories }) => {
      this.accounts.set(accounts);
      this.categories.set(categories);
      this.loaded.set(true);
    });
  }

  changed(): void {
    this.version.update((v) => v + 1);
    this.load(true);
  }

  category(id: number | null | undefined): Category | undefined {
    return id ? this.categories().find((c) => c.id === id) : undefined;
  }
}
