import { Injectable, inject } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
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

  private readonly usersEndpoint = '/users';

  /**
   * Get server-paged users list with filters.
   * Maps to GET /api/users?search=...&role=...&enabled=...&page=...&size=...
   */
  getUsers(filter: UserFilter): Observable<PagedUsers> {
    let params = new HttpParams()
      .set('page', String(filter.page))
      .set('size', String(filter.size));

    if (filter.search) params = params.set('search', filter.search);
    if (filter.role) params = params.set('role', filter.role);
    if (filter.enabled !== undefined && filter.enabled !== null) {
      params = params.set('enabled', String(filter.enabled));
    }
    if (filter.sort) params = params.set('sort', filter.sort);

    return this.api.get<PagedUsers>(this.usersEndpoint, { params });
  }

  /**
   * Get single user summary by UUID.
   * Maps to GET /api/users/{userId}
   */
  getUserById(userId: string): Observable<UserSummaryResponse> {
    return this.api.get<UserSummaryResponse>(`${this.usersEndpoint}/${userId}`);
  }

  /**
   * Admin updates user details (full name, phone, role, enabled).
   * Maps to PUT /api/users/{userId}
   */
  updateUser(userId: string, request: AdminUpdateUserRequest): Observable<UserSummaryResponse> {
    return this.api.put<UserSummaryResponse>(`${this.usersEndpoint}/${userId}`, request);
  }

  /**
   * Admin deactivates target user account.
   * Maps to PATCH /api/users/{userId}/deactivate
   */
  deactivateUser(userId: string): Observable<void> {
    return this.api.patch<void>(`${this.usersEndpoint}/${userId}/deactivate`, {});
  }

  /**
   * Admin reactivates target user account.
   * Maps to PATCH /api/users/{userId}/activate
   */
  activateUser(userId: string): Observable<void> {
    return this.api.patch<void>(`${this.usersEndpoint}/${userId}/activate`, {});
  }

  /**
   * Get user management stats.
   * Maps to GET /api/users/admin/stats
   */
  getUserStats(): Observable<AdminUserStatsResponse> {
    return this.api.get<AdminUserStatsResponse>(`${this.usersEndpoint}/admin/stats`);
  }
}
