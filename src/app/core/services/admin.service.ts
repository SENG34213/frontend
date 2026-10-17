import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, map, catchError, of } from 'rxjs';
import { ApiService } from './api.service';
import { MockDataService } from './mock/mock-data.service';
import { environment } from '../../../environments/environment';
import {
  AdminBookingStatsResponse,
  AdminPaymentStatsResponse,
  AdminUserStatsResponse,
  AdminTournamentStatsResponse,
  AdminBookingRow,
  AdminOverviewStats
} from '../../shared/models';

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly api = inject(ApiService);
  private readonly mock = inject(MockDataService);

  getBookingStats(): Observable<AdminBookingStatsResponse> {
    if (environment.useMocks) {
      return this.mock.getAdminBookingStats();
    }
    return this.api.get<AdminBookingStatsResponse>('/bookings/admin/stats').pipe(
      catchError(() => this.mock.getAdminBookingStats())
    );
  }

  getPaymentStats(trendDays = 14): Observable<AdminPaymentStatsResponse> {
    if (environment.useMocks) {
      return this.mock.getAdminPaymentStats(trendDays);
    }
    return this.api.get<AdminPaymentStatsResponse>(`/payments/admin/stats?trendDays=${trendDays}`).pipe(
      catchError(() => this.mock.getAdminPaymentStats(trendDays))
    );
  }

  getUserStats(): Observable<AdminUserStatsResponse> {
    if (environment.useMocks) {
      return this.mock.getAdminUserStats();
    }
    return this.api.get<AdminUserStatsResponse>('/users/admin/stats').pipe(
      catchError(() => this.mock.getAdminUserStats())
    );
  }

  getTournamentStats(): Observable<AdminTournamentStatsResponse> {
    if (environment.useMocks) {
      return this.mock.getAdminTournamentStats();
    }
    return this.api.get<AdminTournamentStatsResponse>('/tournaments/admin/stats').pipe(
      catchError(() => this.mock.getAdminTournamentStats())
    );
  }

  getRecentBookings(limit = 5): Observable<AdminBookingRow[]> {
    if (environment.useMocks) {
      return this.mock.getAdminRecentBookings().pipe(
        map((rows) => rows.slice(0, limit))
      );
    }
    return this.api.get<{ content?: AdminBookingRow[] } | AdminBookingRow[]>(
      `/bookings/admin/all?size=${limit}&sort=createdAt,desc`
    ).pipe(
      map((res: any) => {
        if (Array.isArray(res)) return res.slice(0, limit);
        if (res && Array.isArray(res.content)) return res.content.slice(0, limit);
        return [];
      }),
      catchError(() => this.mock.getAdminRecentBookings().pipe(map((rows) => rows.slice(0, limit))))
    );
  }

  getOverviewStats(): Observable<AdminOverviewStats> {
    return forkJoin({
      bookings: this.getBookingStats(),
      payments: this.getPaymentStats(14),
      users: this.getUserStats(),
      tournaments: this.getTournamentStats()
    });
  }

  getBookingsExportUrl(): string {
    return `${environment.apiUrl}/bookings/admin/export.csv`;
  }

  getPaymentsExportUrl(): string {
    return `${environment.apiUrl}/payments/admin/export.csv`;
  }
}
