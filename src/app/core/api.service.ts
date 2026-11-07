import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

type Params = Record<string, string | number | boolean | null | undefined>;

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  readonly base = environment.apiUrl;

  private params(p?: Params): HttpParams {
    let hp = new HttpParams();
    for (const [k, v] of Object.entries(p ?? {})) {
      if (v !== null && v !== undefined && v !== '') hp = hp.set(k, String(v));
    }
    return hp;
  }

  get<T>(path: string, params?: Params): Observable<T> {
    return this.http.get<T>(`${this.base}/${path}`, { params: this.params(params) });
  }

  post<T>(path: string, body: unknown = {}): Observable<T> {
    return this.http.post<T>(`${this.base}/${path}`, body);
  }

  put<T>(path: string, body: unknown): Observable<T> {
    return this.http.put<T>(`${this.base}/${path}`, body);
  }

  delete<T = void>(path: string): Observable<T> {
    return this.http.delete<T>(`${this.base}/${path}`);
  }

  blob(path: string, params?: Params): Observable<Blob> {
    return this.http.get(`${this.base}/${path}`, { params: this.params(params), responseType: 'blob' });
  }
}
