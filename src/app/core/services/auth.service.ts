import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import {
  AuthResponse,
  LoginRequest,
  PhoneLoginRequest,
  RegisterRequest,
  TokenPayload,
  UserRole
} from '../../shared/models/auth.model';
import { environment } from '../../../environments/environment';

export const TOKEN_KEY = 'gc_access_token';
export const ROLE_KEY = 'gc_role';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/auth`;

  // State signals
  readonly token = signal<string | null>(this.getStoredToken());
  readonly isAuthenticated = signal<boolean>(!!this.getStoredToken());
  readonly role = signal<UserRole | null>(this.getStoredRole());
  readonly currentUser = signal<TokenPayload | null>(this.parseStoredToken());
  readonly isSessionExpiring = signal<boolean>(false);

  // Computed signals
  readonly isAdmin = computed(() => this.role() === 'ADMIN');
  readonly isCustomer = computed(() => this.role() === 'CUSTOMER');

  private expirationTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.scheduleExpirationWarning();
  }

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

  phoneLogin(request: PhoneLoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/login/phone`, request).pipe(
      tap((res) => this.storeSession(res))
    );
  }

  logout(_returnUrl?: string): void {
    void _returnUrl;
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(ROLE_KEY);
    }
    this.token.set(null);
    this.isAuthenticated.set(false);
    this.role.set(null);
    this.currentUser.set(null);
    this.isSessionExpiring.set(false);

    if (this.expirationTimer) {
      clearTimeout(this.expirationTimer);
      this.expirationTimer = null;
    }
  }

  getToken(): string | null {
    return this.token();
  }

  getUserId(): string | null {
    return this.currentUser()?.userId || this.currentUser()?.sub || null;
  }

  isTokenExpired(): boolean {
    const payload = this.currentUser();
    if (!payload || !payload.exp) return true;
    const nowInSeconds = Math.floor(Date.now() / 1000);
    return payload.exp <= nowInSeconds;
  }

  /**
   * Safely decodes a JWT payload without external dependencies
   */
  decodeToken(token: string): TokenPayload | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;

      // Base64URL to Base64
      let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      while (base64.length % 4) {
        base64 += '=';
      }

      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );

      const parsed = JSON.parse(jsonPayload);
      return {
        sub: parsed.sub || '',
        userId: parsed.userId || parsed.sub || '',
        email: parsed.email || (parsed.sub?.includes('@') ? parsed.sub : undefined),
        role: (parsed.role as UserRole) || 'CUSTOMER',
        fullName: parsed.fullName || parsed.name || undefined,
        iat: parsed.iat || 0,
        exp: parsed.exp || 0
      };
    } catch {
      return null;
    }
  }

  private storeSession(res: AuthResponse): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(TOKEN_KEY, res.accessToken);
      localStorage.setItem(ROLE_KEY, res.role);
    }

    const payload = this.decodeToken(res.accessToken);

    this.token.set(res.accessToken);
    this.role.set(res.role);
    this.currentUser.set(payload);
    this.isAuthenticated.set(true);
    this.isSessionExpiring.set(false);

    this.scheduleExpirationWarning();
  }

  private scheduleExpirationWarning(): void {
    if (this.expirationTimer) {
      clearTimeout(this.expirationTimer);
      this.expirationTimer = null;
    }

    const payload = this.currentUser();
    if (!payload || !payload.exp) return;

    const nowMs = Date.now();
    const expMs = payload.exp * 1000;
    const warningMs = expMs - environment.sessionWarningWindowMs;
    const delayMs = warningMs - nowMs;

    if (delayMs <= 0 && expMs > nowMs) {
      // Already within the warning window
      this.isSessionExpiring.set(true);
    } else if (delayMs > 0) {
      this.expirationTimer = setTimeout(() => {
        this.isSessionExpiring.set(true);
      }, delayMs);
    }
  }

  private getStoredToken(): string | null {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem(TOKEN_KEY);
  }

  private getStoredRole(): UserRole | null {
    if (typeof localStorage === 'undefined') return null;
    return (localStorage.getItem(ROLE_KEY) as UserRole) || null;
  }

  private parseStoredToken(): TokenPayload | null {
    const token = this.getStoredToken();
    if (!token) return null;
    return this.decodeToken(token);
  }
}
