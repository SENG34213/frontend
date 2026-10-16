import { Injectable, inject } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Observable, of, map, catchError } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { MockDataService } from '../../../core/services/mock/mock-data.service';
import { environment } from '../../../../environments/environment';
import { AdminBookingRow } from '../../../shared/models';

export interface BookingFilter {
  status?: string;
  source?: string;
  userId?: string;
  stationId?: string;
  from?: string;
  to?: string;
  page: number;
  size: number;
  sort: string;
}

export interface PagedAdminBookings {
  content: AdminBookingRow[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export interface WalkInRequest {
  targetUserId: string;
  stationId: string;
  startTime: string;   // ISO-8601
  endTime: string;     // ISO-8601
}

export interface RescheduleRequest {
  stationId: string;
  startTime: string;
  endTime: string;
}

@Injectable({ providedIn: 'root' })
export class BookingAdminService {
  private readonly api = inject(ApiService);
  private readonly mock = inject(MockDataService);

  getBookings(filter: BookingFilter): Observable<PagedAdminBookings> {
    if (environment.useMocks) {
      return this.mock.getAdminRecentBookings().pipe(
        map((rows) => ({
          content: rows,
          totalElements: rows.length,
          totalPages: 1,
          number: 0,
          size: filter.size
        }))
      );
    }

    let params = new HttpParams()
      .set('page', filter.page)
      .set('size', filter.size)
      .set('sort', filter.sort);

    if (filter.status) params = params.set('status', filter.status);
    if (filter.source) params = params.set('source', filter.source);
    if (filter.userId) params = params.set('userId', filter.userId);
    if (filter.stationId) params = params.set('stationId', filter.stationId);
    if (filter.from) params = params.set('from', filter.from);
    if (filter.to) params = params.set('to', filter.to);

    return this.api.get<PagedAdminBookings>('/bookings/admin/all', { params }).pipe(
      catchError(() =>
        this.mock.getAdminRecentBookings().pipe(
          map((rows) => ({
            content: rows,
            totalElements: rows.length,
            totalPages: 1,
            number: 0,
            size: filter.size
          }))
        )
      )
    );
  }

  cancelBooking(bookingId: string): Observable<AdminBookingRow> {
    if (environment.useMocks) {
      return this.mock.getAdminRecentBookings().pipe(
        map((rows) => {
          const found = rows.find((r) => r.id === bookingId);
          return found ? { ...found, status: 'CANCELLED' as const } : rows[0];
        })
      );
    }
    return this.api.patch<AdminBookingRow>(`/bookings/${bookingId}/cancel`, {}).pipe(
      catchError((err) => { throw err; })
    );
  }

  rescheduleBooking(bookingId: string, body: RescheduleRequest): Observable<AdminBookingRow> {
    if (environment.useMocks) {
      return this.mock.getAdminRecentBookings().pipe(
        map((rows) => {
          const found = rows.find((r) => r.id === bookingId);
          return found ? { ...found, startTime: body.startTime, endTime: body.endTime } : rows[0];
        })
      );
    }
    return this.api.patch<AdminBookingRow>(`/bookings/${bookingId}/reschedule`, body).pipe(
      catchError((err) => { throw err; })
    );
  }

  confirmBooking(bookingId: string, paymentId: string): Observable<AdminBookingRow> {
    if (environment.useMocks) {
      return this.mock.getAdminRecentBookings().pipe(
        map((rows) => {
          const found = rows.find((r) => r.id === bookingId);
          return found ? { ...found, status: 'CONFIRMED' as const } : rows[0];
        })
      );
    }
    return this.api.patch<AdminBookingRow>(`/bookings/${bookingId}/confirm`, { paymentId }).pipe(
      catchError((err) => { throw err; })
    );
  }

  createWalkIn(body: WalkInRequest): Observable<AdminBookingRow> {
    if (environment.useMocks) {
      const today = new Date().toISOString();
      const mock: AdminBookingRow = {
        id: 'bk-walkin-' + Date.now(),
        userId: body.targetUserId,
        stationId: body.stationId,
        stationCode: 'MOCK-01',
        stationType: 'PS5',
        hourlyRate: 650,
        startTime: body.startTime,
        endTime: body.endTime,
        durationMinutes: 60,
        status: 'PENDING',
        source: 'WALK_IN',
        totalAmount: 650,
        payableAmount: 650,
        createdAt: today
      };
      return of(mock);
    }
    return this.api.post<AdminBookingRow>('/bookings/walk-in', body).pipe(
      catchError((err) => { throw err; })
    );
  }

  exportCsv(filter: Omit<BookingFilter, 'page' | 'size' | 'sort'>): string {
    const base = environment.apiUrl + '/bookings/admin/export.csv';
    const parts: string[] = [];
    if (filter.status) parts.push(`status=${filter.status}`);
    if (filter.source) parts.push(`source=${filter.source}`);
    if (filter.from) parts.push(`from=${filter.from}`);
    if (filter.to) parts.push(`to=${filter.to}`);
    return parts.length ? `${base}?${parts.join('&')}` : base;
  }
}
