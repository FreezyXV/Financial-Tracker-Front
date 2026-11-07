import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth.service';
import { StoreService } from '../../../core/store.service';
import { ToastService } from '../../../core/toast.service';

@Component({
  selector: 'app-login',
  imports: [FormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: '../auth.scss',
  templateUrl: './login.component.html',
})
export class LoginComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  private toast = inject(ToastService);
  private store = inject(StoreService);
  email = '';
  password = '';
  busy = signal(false);

  fillDemo(): void {
    this.email = 'demo@finance.test';
    this.password = 'password';
  }

  login(): void {
    this.busy.set(true);
    this.auth.login({ email: this.email, password: this.password }).subscribe({
      next: () => {
        this.store.load(true);
        this.router.navigate(['/']);
      },
      error: (e) => {
        this.busy.set(false);
        this.toast.error(e, 'Identifiants incorrects.');
      },
    });
  }
}
