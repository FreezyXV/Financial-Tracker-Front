import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '@core/auth/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './register.component.html',
})
export class RegisterComponent {
  name = '';
  email = '';
  password = '';
  password_confirmation = '';
  error = '';

  constructor(private authService: AuthService, private router: Router) {}

  register() {
    this.authService.register({
      name: this.name,
      email: this.email,
      password: this.password,
      password_confirmation: this.password_confirmation,
    }).subscribe({
      next: () => this.router.navigate(['/login']),
      error: () => this.error = 'Registration failed',
    });
  }
}
