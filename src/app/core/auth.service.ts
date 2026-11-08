import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, map, of, tap } from 'rxjs';
import { ApiService } from './api.service';
import { User } from './models';

interface AuthResponse {
  user: User;
  token: string;
}

const TOKEN_KEY = 'ft_token';

function readToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private api = inject(ApiService);
  private router = inject(Router);

  readonly token = signal<string | null>(readToken());
  readonly user = signal<User | null>(null);
  readonly isLoggedIn = computed(() => !!this.token());

  private store(res: AuthResponse): void {
    try {
      localStorage.setItem(TOKEN_KEY, res.token);
    } catch {
      /* stockage indisponible : session en mémoire */
    }
    this.token.set(res.token);
    this.user.set(res.user);
  }

  login(data: { email: string; password: string }): Observable<AuthResponse> {
    return this.api.post<AuthResponse>('login', data).pipe(tap((r) => this.store(r)));
  }

  register(data: { name: string; email: string; password: string; password_confirmation: string }): Observable<AuthResponse> {
    return this.api.post<AuthResponse>('register', data).pipe(tap((r) => this.store(r)));
  }

  /** Utilisateur courant, chargé si nécessaire (utilisé par les gardes de route). */
  ensureUser(): Observable<User> {
    const u = this.user();
    return u ? of(u) : this.api.get<User>('me').pipe(tap((x) => this.user.set(x)), map((x) => x));
  }

  loadMe(): void {
    if (!this.token() || this.user()) return;
    this.api.get<User>('me').subscribe({ next: (u) => this.user.set(u), error: () => undefined });
  }

  updateProfile(data: Partial<User> & { password?: string; password_confirmation?: string; current_password?: string }): Observable<User> {
    return this.api.put<User>('me', data).pipe(tap((u) => this.user.set(u)));
  }

  clear(): void {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* rien */
    }
    this.token.set(null);
    this.user.set(null);
  }

  logout(): void {
    this.api.post('logout').subscribe({ complete: () => undefined, error: () => undefined });
    this.clear();
    this.router.navigate(['/login']);
  }
}
