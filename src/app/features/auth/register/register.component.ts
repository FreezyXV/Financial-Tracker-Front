import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth.service';
import { StoreService } from '../../../core/store.service';
import { ToastService } from '../../../core/toast.service';

@Component({
  selector: 'app-register',
  imports: [FormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: '../auth.scss',
  templateUrl: './register.component.html',
})
export class RegisterComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  private toast = inject(ToastService);
  private store = inject(StoreService);
  name = '';
  email = '';
  password = '';
  password_confirmation = '';
  busy = signal(false);

  register(): void {
    if (this.password !== this.password_confirmation) {
      this.toast.show('Les mots de passe ne correspondent pas.', 'error');
      return;
    }
    this.busy.set(true);
    this.auth.register({ name: this.name, email: this.email, password: this.password, password_confirmation: this.password_confirmation }).subscribe({
      next: () => {
        this.store.load(true);
        this.router.navigate(['/accounts'], { queryParams: { onboarding: 1 } });
      },
      error: (e) => {
        this.busy.set(false);
        this.toast.error(e, 'Inscription impossible.');
      },
    });
  }
}
