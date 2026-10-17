import { Injectable, inject } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Observable, catchError } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { MockDataService } from '../../../core/services/mock/mock-data.service';
import { environment } from '../../../../environments/environment';
import {
  UserSummaryResponse,
  AdminUpdateUserRequest,
  AdminUserStatsResponse,
  PagedUsers,
  UserFilter
} from '../../../shared/models';

@Injectable({ providedIn: 'root' })
export class UserAdminService {
  private readonly api = inject(ApiService);
  private readonly mock = inject(MockDataService);

  private readonly usersEndpoint = '/users';

  /**
   * Get server-paged users list with filters.
   * Maps to GET /api/users?search=...&role=...&enabled=...&page=...&size=...
   */
  getUsers(filter: UserFilter): Observable<PagedUsers> {
    if (environment.useMocks) {
      return this.mock.getAdminUsers(filter);
    }

    let params = new HttpParams()
      .set('page', String(filter.page))
      .set('size', String(filter.size));

    if (filter.search) params = params.set('search', filter.search);
    if (filter.role) params = params.set('role', filter.role);
    if (filter.enabled !== undefined && filter.enabled !== null) {
      params = params.set('enabled', String(filter.enabled));
    }
    if (filter.sort) params = params.set('sort', filter.sort);

    return this.api.get<PagedUsers>(this.usersEndpoint, { params }).pipe(
      catchError(() => this.mock.getAdminUsers(filter))
    );
  }

  /**
   * Get single user summary by UUID.
   * Maps to GET /api/users/{userId}
   */
  getUserById(userId: string): Observable<UserSummaryResponse> {
    if (environment.useMocks) {
      return this.mock.getAdminUserById(userId);
    }

    return this.api.get<UserSummaryResponse>(`${this.usersEndpoint}/${userId}`).pipe(
      catchError(() => this.mock.getAdminUserById(userId))
    );
  }

  /**
   * Admin updates user details (full name, phone, role, enabled).
   * Maps to PUT /api/users/{userId}
   */
  updateUser(userId: string, request: AdminUpdateUserRequest): Observable<UserSummaryResponse> {
    if (environment.useMocks) {
      return this.mock.adminUpdateUser(userId, request);
    }

    return this.api.put<UserSummaryResponse>(`${this.usersEndpoint}/${userId}`, request).pipe(
      catchError(() => this.mock.adminUpdateUser(userId, request))
    );
  }

  /**
   * Admin deactivates target user account.
   * Maps to PATCH /api/users/{userId}/deactivate
   */
  deactivateUser(userId: string): Observable<void> {
    if (environment.useMocks) {
      return this.mock.adminDeactivateUser(userId);
    }

    return this.api.patch<void>(`${this.usersEndpoint}/${userId}/deactivate`, {}).pipe(
      catchError(() => this.mock.adminDeactivateUser(userId))
    );
  }

  /**
   * Admin reactivates target user account.
   * Maps to PATCH /api/users/{userId}/activate
   */
  activateUser(userId: string): Observable<void> {
    if (environment.useMocks) {
      return this.mock.adminActivateUser(userId);
    }

    return this.api.patch<void>(`${this.usersEndpoint}/${userId}/activate`, {}).pipe(
      catchError(() => this.mock.adminActivateUser(userId))
    );
  }

  /**
   * Get user management stats.
   * Maps to GET /api/users/admin/stats
   */
  getUserStats(): Observable<AdminUserStatsResponse> {
    if (environment.useMocks) {
      return this.mock.getAdminUserStats();
    }

    return this.api.get<AdminUserStatsResponse>(`${this.usersEndpoint}/admin/stats`).pipe(
      catchError(() => this.mock.getAdminUserStats())
    );
  }
}
