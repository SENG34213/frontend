import { Injectable, inject } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
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

  getBookings(filter: BookingFilter): Observable<PagedAdminBookings> {
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

    return this.api.get<PagedAdminBookings>('/bookings/admin/all', { params });
  }

  cancelBooking(bookingId: string): Observable<AdminBookingRow> {
    return this.api.patch<AdminBookingRow>(`/bookings/${bookingId}/cancel`, {});
  }

  rescheduleBooking(bookingId: string, body: RescheduleRequest): Observable<AdminBookingRow> {
    return this.api.patch<AdminBookingRow>(`/bookings/${bookingId}/reschedule`, body);
  }

  confirmBooking(bookingId: string, paymentId: string): Observable<AdminBookingRow> {
    return this.api.patch<AdminBookingRow>(`/bookings/${bookingId}/confirm`, { paymentId });
  }

  createWalkIn(body: WalkInRequest): Observable<AdminBookingRow> {
    return this.api.post<AdminBookingRow>('/bookings/walk-in', body);
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
