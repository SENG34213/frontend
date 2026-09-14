import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

export interface AuthResponse {
  accessToken: string;
  tokenType: string;
  userId: string;
  email: string;
  role: 'CUSTOMER' | 'ADMIN';
}

export interface RegisterRequest {
  email: string;
  password: string;
  fullName: string;
  phoneNumber?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

const TOKEN_KEY = 'gc_access_token';
const ROLE_KEY = 'gc_role';

/**
 * Talks to the API Gateway, which routes /api/auth/** to User Service
 * (see infra/docker-compose + backend/api-gateway routes).
 * Keeps auth state in a signal so components can react to login/logout
 * without manually subscribing everywhere.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly baseUrl = '/api/auth';

  readonly isAuthenticated = signal<boolean>(!!localStorage.getItem(TOKEN_KEY));
  readonly role = signal<string | null>(localStorage.getItem(ROLE_KEY));

  constructor(private http: HttpClient) {}

  register(request: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/register`, request).pipe(
      tap((res) => this.storeSession(res))
    );
  }

  login(request: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/login`, request).pipe(
      tap((res) => this.storeSession(res))
    );
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(ROLE_KEY);
    this.isAuthenticated.set(false);
    this.role.set(null);
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  isAdmin(): boolean {
    return this.role() === 'ADMIN';
  }

  private storeSession(res: AuthResponse): void {
    localStorage.setItem(TOKEN_KEY, res.accessToken);
    localStorage.setItem(ROLE_KEY, res.role);
    this.isAuthenticated.set(true);
    this.role.set(res.role);
  }
}
