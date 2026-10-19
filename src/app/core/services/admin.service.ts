import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, map } from 'rxjs';
import { ApiService } from './api.service';
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

  getBookingStats(): Observable<AdminBookingStatsResponse> {
    return this.api.get<AdminBookingStatsResponse>('/bookings/admin/stats');
  }

  getPaymentStats(trendDays = 14): Observable<AdminPaymentStatsResponse> {
    return this.api.get<AdminPaymentStatsResponse>(`/payments/admin/stats?trendDays=${trendDays}`);
  }

  getUserStats(): Observable<AdminUserStatsResponse> {
    return this.api.get<AdminUserStatsResponse>('/users/admin/stats');
  }

  getTournamentStats(): Observable<AdminTournamentStatsResponse> {
    return this.api.get<AdminTournamentStatsResponse>('/tournaments/admin/stats');
  }

  getRecentBookings(limit = 5): Observable<AdminBookingRow[]> {
    return this.api.get<{ content?: AdminBookingRow[] } | AdminBookingRow[]>(
      `/bookings/admin/all?size=${limit}&sort=createdAt,desc`
    ).pipe(
      map((res: { content?: AdminBookingRow[] } | AdminBookingRow[]) => {
        if (Array.isArray(res)) return res.slice(0, limit);
        if (res && Array.isArray(res.content)) return res.content.slice(0, limit);
        return [];
      })
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
