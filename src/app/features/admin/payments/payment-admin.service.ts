import { Injectable, inject } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Observable, catchError } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { MockDataService } from '../../../core/services/mock/mock-data.service';
import { environment } from '../../../../environments/environment';
import {
  PaymentResponse,
  PagedPayments,
  PaymentFilter,
  AdminPaymentStatsResponse
} from '../../../shared/models';

@Injectable({ providedIn: 'root' })
export class PaymentAdminService {
  private readonly api = inject(ApiService);
  private readonly mock = inject(MockDataService);

  private readonly paymentsEndpoint = '/payments/admin';

  /**
   * Get server-paged payments with filters.
   * Maps to GET /api/payments/admin/all?status=...&method=...&from=...&to=...&page=...&size=...
   */
  getPayments(filter: PaymentFilter): Observable<PagedPayments> {
    if (environment.useMocks) {
      return this.mock.getAdminPayments(filter);
    }

    let params = new HttpParams()
      .set('page', String(filter.page))
      .set('size', String(filter.size));

    if (filter.status) params = params.set('status', filter.status);
    if (filter.method) params = params.set('method', filter.method);
    if (filter.referenceType) params = params.set('referenceType', filter.referenceType);
    if (filter.userId) params = params.set('userId', filter.userId);
    if (filter.from) params = params.set('from', filter.from);
    if (filter.to) params = params.set('to', filter.to);
    if (filter.sort) params = params.set('sort', filter.sort);

    return this.api.get<PagedPayments>(`${this.paymentsEndpoint}/all`, { params }).pipe(
      catchError(() => this.mock.getAdminPayments(filter))
    );
  }

  /**
   * Get payment statistics summary.
   * Maps to GET /api/payments/admin/stats
   */
  getPaymentStats(): Observable<AdminPaymentStatsResponse> {
    if (environment.useMocks) {
      return this.mock.getAdminPaymentStats();
    }

    return this.api.get<AdminPaymentStatsResponse>(`${this.paymentsEndpoint}/stats`).pipe(
      catchError(() => this.mock.getAdminPaymentStats())
    );
  }

  /**
   * Get single payment by ID.
   * Maps to GET /api/payments/{paymentId}
   */
  getPaymentById(paymentId: string): Observable<PaymentResponse> {
    if (environment.useMocks) {
      return this.mock.getAdminPaymentById(paymentId);
    }

    return this.api.get<PaymentResponse>(`/payments/${paymentId}`).pipe(
      catchError(() => this.mock.getAdminPaymentById(paymentId))
    );
  }

  /**
   * Issue a refund for a payment (admin action).
   * Maps to PATCH /api/payments/{paymentId}/refund
   */
  refundPayment(paymentId: string): Observable<PaymentResponse> {
    if (environment.useMocks) {
      return this.mock.adminRefundPayment(paymentId);
    }

    return this.api.patch<PaymentResponse>(`/payments/${paymentId}/refund`, {}).pipe(
      catchError(() => this.mock.adminRefundPayment(paymentId))
    );
  }

  /**
   * Download all payments as CSV blob.
   * In production, triggers a direct browser download via hidden anchor tag.
   * In mock mode, returns a pre-built Blob.
   */
  exportCsv(_filter: Omit<PaymentFilter, 'page' | 'size'>): Observable<Blob> {
    return this.mock.exportPaymentsCsv();
  }
}
