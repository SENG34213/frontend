import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { PaymentAdminService } from './payment-admin.service';
import { ApiService } from '../../../core/services/api.service';
import { PaymentFilter, PaymentResponse, AdminPaymentStatsResponse } from '../../../shared/models';

describe('PaymentAdminService', () => {
  let service: PaymentAdminService;
  let apiSpy: jasmine.SpyObj<ApiService>;

  const mockPayment: PaymentResponse = {
    id: 'pay-001',
    userId: 'usr-001',
    amount: 1500,
    status: 'SUCCESS',
    method: 'CARD',
    referenceType: 'BOOKING',
    referenceId: 'bk-001',
    receiptNumber: 'RCP-2026-001',
    customerName: 'Kasun Perera',
    createdAt: '2026-10-19T10:00:00Z'
  };

  beforeEach(() => {
    apiSpy = jasmine.createSpyObj('ApiService', ['get', 'patch']);
    TestBed.configureTestingModule({
      providers: [
        PaymentAdminService,
        { provide: ApiService, useValue: apiSpy }
      ]
    });
    service = TestBed.inject(PaymentAdminService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should get payments with filter params', (done) => {
    const filter: PaymentFilter = {
      page: 0,
      size: 10,
      sort: 'createdAt,desc',
      status: 'SUCCESS',
      method: 'CARD',
      referenceType: 'BOOKING',
      userId: 'usr-001',
      from: '2026-10-01',
      to: '2026-10-19'
    };

    apiSpy.get.and.returnValue(of({
      content: [mockPayment],
      totalElements: 1,
      totalPages: 1,
      number: 0,
      size: 10
    }));

    service.getPayments(filter).subscribe(res => {
      expect(res.content.length).toBe(1);
      expect(apiSpy.get).toHaveBeenCalledWith('/payments/admin/all', jasmine.any(Object));
      done();
    });
  });

  it('should get payment stats', (done) => {
    const mockStats: AdminPaymentStatsResponse = {
      todayRevenue: 15000,
      monthRevenue: 300000,
      totalPaymentsSuccess: 200,
      totalPaymentsFailed: 5,
      revenueTrend: []
    };

    apiSpy.get.and.returnValue(of(mockStats));

    service.getPaymentStats().subscribe(stats => {
      expect(stats.todayRevenue).toBe(15000);
      expect(apiSpy.get).toHaveBeenCalledWith('/payments/admin/stats');
      done();
    });
  });

  it('should get payment by ID', (done) => {
    apiSpy.get.and.returnValue(of(mockPayment));

    service.getPaymentById('pay-001').subscribe(res => {
      expect(res.id).toBe('pay-001');
      expect(apiSpy.get).toHaveBeenCalledWith('/payments/pay-001');
      done();
    });
  });

  it('should refund payment via PATCH', (done) => {
    apiSpy.patch.and.returnValue(of({ ...mockPayment, status: 'REFUNDED' }));

    service.refundPayment('pay-001').subscribe(res => {
      expect(res.status).toBe('REFUNDED');
      expect(apiSpy.patch).toHaveBeenCalledWith('/payments/pay-001/refund', {});
      done();
    });
  });

  it('should export payments as CSV blob', (done) => {
    apiSpy.get.and.returnValue(of({
      content: [mockPayment, { ...mockPayment, id: 'pay-002', customerName: 'Name "With" Quotes' }],
      totalElements: 2,
      totalPages: 1,
      number: 0,
      size: 500
    }));

    service.exportCsv({ status: 'SUCCESS' }).subscribe(blob => {
      expect(blob).toBeTruthy();
      expect(blob.type).toContain('text/csv');
      done();
    });
  });
});
