import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, switchMap } from 'rxjs';

interface AuthResponse {
  user: {
    id: number;
    name: string;
    email: string;
  };
  token: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private baseUrl = 'http://127.0.0.1:8000';
  private apiUrl = `${this.baseUrl}/api`;

  constructor(private http: HttpClient) {}

  /**
   * Get Sanctum CSRF cookie (required before login/register)
   */
  getCsrfToken(): Observable<any> {
    return this.http.get(`${this.baseUrl}/sanctum/csrf-cookie`, {
      withCredentials: true,
    });
  }

  /**
   * Register new user (automatically retrieves CSRF first)
   */
  register(data: {
    name: string;
    email: string;
    password: string;
    password_confirmation: string;
  }): Observable<AuthResponse> {
    return this.getCsrfToken().pipe(
      switchMap(() =>
        this.http.post<AuthResponse>(`${this.apiUrl}/register`, data, {
          withCredentials: true,
        })
      )
    );
  }

  /**
   * Login user (automatically retrieves CSRF first)
   */
  login(data: { email: string; password: string }): Observable<AuthResponse> {
    return this.getCsrfToken().pipe(
      switchMap(() =>
        this.http.post<AuthResponse>(`${this.apiUrl}/login`, data, {
          withCredentials: true,
        })
      )
    );
  }

  /**
   * Logout current user (with credentials)
   */
  logout(): Observable<any> {
    return this.http.post(`${this.apiUrl}/logout`, {}, {
      withCredentials: true,
    });
  }
}
