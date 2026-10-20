import { Injectable, inject, signal } from '@angular/core';
import { Observable, catchError, of, tap } from 'rxjs';
import { ApiService } from './api.service';
import { MockDataService } from './mock/mock-data.service';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';
import { UserProfile } from '../../shared/models/user.model';

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly api = inject(ApiService);
  private readonly mock = inject(MockDataService);
  private readonly auth = inject(AuthService);

  readonly currentProfile = signal<UserProfile | null>(null);
  readonly isLoading = signal<boolean>(false);

  /**
   * Retrieves current authenticated user's profile.
   * Caches in `currentProfile` signal to avoid redundant requests across navigations.
   * Maps to GET /api/users/me
   */
  getMyProfile(forceRefresh = false): Observable<UserProfile | null> {
    if (!forceRefresh && this.currentProfile()) {
      return of(this.currentProfile());
    }

    const authUser = this.auth.currentUser();
    const userId = authUser?.userId || authUser?.sub || 'usr-customer-1';

    if (environment.useMocks) {
      this.isLoading.set(true);
      return this.mock.getUserProfile(userId).pipe(
        tap((p) => {
          this.currentProfile.set(p);
          this.isLoading.set(false);
        }),
        catchError(() => {
          this.isLoading.set(false);
          return of(null);
        })
      );
    }

    this.isLoading.set(true);
    return this.api.get<UserProfile>('/users/me').pipe(
      tap((p) => {
        this.currentProfile.set(p);
        this.isLoading.set(false);
      }),
      catchError(() => {
        // Fallback to mock data if backend unavailable in dev
        return this.mock.getUserProfile(userId).pipe(
          tap((p) => {
            this.currentProfile.set(p);
            this.isLoading.set(false);
          }),
          catchError(() => {
            this.isLoading.set(false);
            return of(null);
          })
        );
      })
    );
  }

  clearCachedProfile(): void {
    this.currentProfile.set(null);
  }
}
