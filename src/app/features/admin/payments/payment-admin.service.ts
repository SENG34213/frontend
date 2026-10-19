import { Injectable, inject } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import {
  PaymentResponse,
  PagedPayments,
  PaymentFilter,
  AdminPaymentStatsResponse
} from '../../../shared/models';

@Injectable({ providedIn: 'root' })
export class PaymentAdminService {
  private readonly api = inject(ApiService);

  private readonly paymentsEndpoint = '/payments/admin';

  /**
   * Get server-paged payments with filters.
   * Maps to GET /api/payments/admin/all?status=...&method=...&from=...&to=...&page=...&size=...
   */
  getPayments(filter: PaymentFilter): Observable<PagedPayments> {
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

    return this.api.get<PagedPayments>(`${this.paymentsEndpoint}/all`, { params });
  }

  /**
   * Get payment statistics summary.
   * Maps to GET /api/payments/admin/stats
   */
  getPaymentStats(): Observable<AdminPaymentStatsResponse> {
    return this.api.get<AdminPaymentStatsResponse>(`${this.paymentsEndpoint}/stats`);
  }

  /**
   * Get single payment by ID.
   * Maps to GET /api/payments/{paymentId}
   */
  getPaymentById(paymentId: string): Observable<PaymentResponse> {
    return this.api.get<PaymentResponse>(`/payments/${paymentId}`);
  }

  /**
   * Issue a refund for a payment (admin action).
   * Maps to PATCH /api/payments/{paymentId}/refund
   */
  refundPayment(paymentId: string): Observable<PaymentResponse> {
    return this.api.patch<PaymentResponse>(`/payments/${paymentId}/refund`, {});
  }

  /**
   * Download payments as CSV blob using live backend data.
   */
  exportCsv(filter: Omit<PaymentFilter, 'page' | 'size'>): Observable<Blob> {
    return this.getPayments({ ...filter, page: 0, size: 500, sort: 'createdAt,desc' }).pipe(
      map((res) => {
        const rows = res.content || [];
        const headers = ['ID', 'Receipt #', 'Customer', 'Reference Type', 'Amount (LKR)', 'Method', 'Status', 'Date'];
        const lines = rows.map((p) => [
          `"${p.id}"`,
          `"${p.receiptNumber || ''}"`,
          `"${(p.customerName || p.userId || '').replace(/"/g, '""')}"`,
          `"${p.referenceType || ''}"`,
          `"${p.amount.toFixed(2)}"`,
          `"${p.method || p.paymentMethod || ''}"`,
          `"${p.status}"`,
          `"${p.createdAt}"`
        ].join(','));
        const csvContent = [headers.join(','), ...lines].join('\r\n');
        return new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      })
    );
  }
}
