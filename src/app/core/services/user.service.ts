import { Injectable, inject, signal } from '@angular/core';
import { Observable, catchError, of, tap } from 'rxjs';
import { ApiService } from './api.service';
import { MockDataService } from './mock/mock-data.service';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';
import { UserProfile, UpdateProfileRequest } from '../../shared/models/user.model';

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

  /**
   * Updates current authenticated user's profile details (fullName, phoneNumber, avatarUrl).
   * Maps to PATCH /api/users/me
   */
  updateMyProfile(req: UpdateProfileRequest): Observable<UserProfile> {
    this.isLoading.set(true);

    if (environment.useMocks) {
      const authUser = this.auth.currentUser();
      const userId = authUser?.userId || authUser?.sub || 'usr-customer-1';
      return this.mock.updateUserProfile(userId, req).pipe(
        tap((p) => {
          this.currentProfile.set(p);
          const profileSig = this.auth.userProfile as unknown as { set?: (val: unknown) => void };
          if (typeof profileSig?.set === 'function') {
            profileSig.set(p);
          }
          if (typeof this.auth.currentUser === 'function') {
            const cur = this.auth.currentUser();
            const curUserSig = this.auth.currentUser as unknown as { set?: (val: unknown) => void };
            if (cur && typeof curUserSig?.set === 'function') {
              curUserSig.set({
                ...cur,
                fullName: p.fullName || cur.fullName,
                avatarUrl: p.avatarUrl || p.profileImageUrl || undefined
              });
            }
          }
          this.isLoading.set(false);
        }),
        catchError((err) => {
          this.isLoading.set(false);
          throw err;
        })
      );
    }

    return this.auth.updateMyProfile(req).pipe(
      tap((p) => {
        this.currentProfile.set(p);
        this.isLoading.set(false);
      }),
      catchError((err) => {
        this.isLoading.set(false);
        throw err;
      })
    );
  }

  clearCachedProfile(): void {
    this.currentProfile.set(null);
  }
}
