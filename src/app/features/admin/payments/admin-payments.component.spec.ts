import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of, throwError } from 'rxjs';

import { AdminPaymentsComponent } from './admin-payments.component';
import { PaymentAdminService } from './payment-admin.service';
import { UserAdminService } from '../users/user-admin.service';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import {
  PagedPayments,
  PaymentResponse,
  AdminPaymentStatsResponse
} from '../../../shared/models';

const mockPayment: PaymentResponse = {
  id: 'pay-001',
  userId: 'usr-001',
  amount: 1500,
  status: 'SUCCESS',
  method: 'CARD',
  referenceType: 'BOOKING',
  referenceId: 'bk-001',
  receiptNumber: 'RCP-2026-001',
  transactionReference: 'TXN-ABC',
  customerName: 'Kasun Perera',
  customerEmail: 'kasun@test.lk',
  createdAt: '2026-10-01T10:00:00Z'
};

const today = new Date();
const getOffsetDate = (daysAgo: number) => {
  const d = new Date(today);
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0];
};

const mockStats: AdminPaymentStatsResponse = {
  todayRevenue: 15000,
  monthRevenue: 320000,
  totalPaymentsSuccess: 210,
  totalPaymentsFailed: 8,
  revenueTrend: [
    { date: getOffsetDate(4), revenue: 12000 },
    { date: getOffsetDate(3), revenue: 18000 },
    { date: getOffsetDate(2), revenue: 9500 },
    { date: getOffsetDate(1), revenue: 22000 },
    { date: getOffsetDate(0), revenue: 15000 }
  ]
};

const mockPage: PagedPayments = {
  content: [mockPayment],
  totalElements: 1,
  totalPages: 1,
  size: 12,
  number: 0
};

describe('AdminPaymentsComponent', () => {
  let component: AdminPaymentsComponent;
  let fixture: ComponentFixture<AdminPaymentsComponent>;
  let paymentSvc: jasmine.SpyObj<PaymentAdminService>;
  let toastSvc: jasmine.SpyObj<ToastService>;

  beforeEach(async () => {
    const paymentSpy = jasmine.createSpyObj<PaymentAdminService>('PaymentAdminService', [
      'getPayments', 'getPaymentStats', 'getPaymentById', 'refundPayment', 'exportCsv'
    ]);
    const toastSpy = jasmine.createSpyObj<ToastService>('ToastService', [
      'success', 'error', 'warning'
    ]);
    const userSpy = jasmine.createSpyObj<UserAdminService>('UserAdminService', ['getUsers', 'getUserById']);
    const mockCustomer = {
      id: 'usr-001',
      email: 'kasun@test.lk',
      fullName: 'Kasun Perera',
      role: 'CUSTOMER' as const,
      enabled: true
    };
    userSpy.getUsers.and.returnValue(of({
      content: [mockCustomer],
      totalElements: 1,
      totalPages: 1,
      size: 100,
      number: 0
    }));
    userSpy.getUserById.and.returnValue(of(mockCustomer));

    paymentSpy.getPayments.and.returnValue(of(mockPage));
    paymentSpy.getPaymentStats.and.returnValue(of(mockStats));
    paymentSpy.refundPayment.and.returnValue(of({ ...mockPayment, status: 'REFUNDED' }));
    paymentSpy.exportCsv.and.returnValue(of(new Blob(['csv'])));

    await TestBed.configureTestingModule({
      imports: [AdminPaymentsComponent],
      providers: [
        { provide: PaymentAdminService, useValue: paymentSpy },
        { provide: UserAdminService, useValue: userSpy },
        { provide: ToastService, useValue: toastSpy },
        { provide: ActivatedRoute, useValue: { queryParams: of({}) } },
        { provide: Router, useValue: { navigate: jasmine.createSpy('navigate') } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AdminPaymentsComponent);
    component = fixture.componentInstance;
    paymentSvc = TestBed.inject(PaymentAdminService) as jasmine.SpyObj<PaymentAdminService>;
    toastSvc = TestBed.inject(ToastService) as jasmine.SpyObj<ToastService>;

    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  describe('loadPayments()', () => {
    it('should populate payments signal on success', () => {
      expect(component.payments().length).toBe(1);
      expect(component.payments()[0].id).toBe('pay-001');
    });

    it('should set totalElements from page response', () => {
      expect(component.totalElements()).toBe(1);
    });

    it('should set isLoading to false after success', () => {
      expect(component.isLoading()).toBeFalse();
    });

    it('should show error on failure and toast', () => {
      paymentSvc.getPayments.and.returnValue(throwError(() => ({ message: 'Server error' })));
      component.loadPayments();
      fixture.detectChanges();

      expect(component.errorMessage()).toBe('Server error');
      expect(toastSvc.error).toHaveBeenCalledWith('Could not load payment records');
    });
  });

  describe('loadStats()', () => {
    it('should set stats signal with API response', () => {
      expect(component.stats()).not.toBeNull();
      expect(component.stats()?.todayRevenue).toBe(15000);
      expect(component.stats()?.revenueTrend.length).toBe(5);
    });
  });

  describe('openDetail() / closeDetail()', () => {
    it('should open the detail drawer with selected payment', () => {
      component.openDetail(mockPayment);
      expect(component.detailDrawerOpen()).toBeTrue();
      expect(component.selectedPayment()?.id).toBe('pay-001');
    });

    it('should close the detail drawer', () => {
      component.openDetail(mockPayment);
      component.closeDetail();
      expect(component.detailDrawerOpen()).toBeFalse();
    });
  });

  describe('promptRefund() / confirmRefund()', () => {
    it('should open refund confirm modal', () => {
      component.promptRefund(mockPayment);
      expect(component.refundModalOpen()).toBeTrue();
      expect(component.targetRefund()?.id).toBe('pay-001');
    });

    it('should call refundPayment service and update list on confirm', () => {
      component.promptRefund(mockPayment);
      component.confirmRefund();

      expect(paymentSvc.refundPayment).toHaveBeenCalledWith('pay-001');
      expect(toastSvc.success).toHaveBeenCalled();
      expect(component.refundModalOpen()).toBeFalse();
    });

    it('should toast error if refund fails', () => {
      paymentSvc.refundPayment.and.returnValue(throwError(() => ({ message: 'Refund denied' })));
      component.promptRefund(mockPayment);
      component.confirmRefund();

      expect(toastSvc.error).toHaveBeenCalledWith('Refund denied');
      expect(component.actionInFlight()).toBeFalse();
    });
  });

  describe('canRefund()', () => {
    it('should return true for SUCCESS payments', () => {
      expect(component.canRefund(mockPayment)).toBeTrue();
    });

    it('should return false for non-SUCCESS payments', () => {
      expect(component.canRefund({ ...mockPayment, status: 'REFUNDED' })).toBeFalse();
      expect(component.canRefund({ ...mockPayment, status: 'FAILED' })).toBeFalse();
      expect(component.canRefund({ ...mockPayment, status: 'PENDING' })).toBeFalse();
    });
  });

  describe('exportCsv()', () => {
    it('should toast warning when no payments', () => {
      component.payments.set([]);
      component.exportCsv();
      expect(toastSvc.warning).toHaveBeenCalledWith('No payment records available to export');
    });

    it('should toast success when payments are exported', () => {
      component.payments.set([mockPayment]);
      component.exportCsv();
      expect(toastSvc.success).toHaveBeenCalled();
    });
  });

  describe('statusBadgeVariant()', () => {
    it('should map SUCCESS → success', () => {
      expect(component.statusBadgeVariant('SUCCESS')).toBe('success');
    });
    it('should map FAILED → danger', () => {
      expect(component.statusBadgeVariant('FAILED')).toBe('danger');
    });
    it('should map REFUNDED → warning', () => {
      expect(component.statusBadgeVariant('REFUNDED')).toBe('warning');
    });
    it('should map PENDING → primary', () => {
      expect(component.statusBadgeVariant('PENDING')).toBe('primary');
    });
  });

  describe('getTrendBarHeight()', () => {
    it('should return 100 for the max revenue value', () => {
      const maxRevenue = 22000; // from mockStats
      expect(component.getTrendBarHeight(maxRevenue)).toBe(100);
    });

    it('should return proportional height for lesser values', () => {
      const height = component.getTrendBarHeight(11000); // half of 22000
      expect(height).toBe(50);
    });
  });

  describe('clearFilters()', () => {
    it('should reset all filter signals and reload payments', () => {
      component.filterStatus.set('SUCCESS');
      component.filterMethod.set('CARD');
      component.clearFilters();

      expect(component.filterStatus()).toBe('');
      expect(component.filterMethod()).toBe('');
      expect(paymentSvc.getPayments).toHaveBeenCalled();
    });
  });

  describe('formatDate() / formatDateTime()', () => {
    it('should return em-dash for falsy input', () => {
      expect(component.formatDate(undefined)).toBe('—');
      expect(component.formatDateTime(undefined)).toBe('—');
    });

    it('should format valid ISO dates', () => {
      const result = component.formatDate('2026-10-01T10:00:00Z');
      expect(result).toContain('Oct');
      expect(result).toContain('2026');
    });
  });

  describe('SVG chart computed signals and helpers', () => {
    it('should compute maxTrendRevenue from sevenDayTrend', () => {
      expect(component.maxTrendRevenue()).toBe(22000);
    });

    it('should return 1 for maxTrendRevenue when stats is null', () => {
      component.stats.set(null);
      expect(component.maxTrendRevenue()).toBe(1);
    });

    it('should compute totalTrendRevenue as sum of 7-day trend', () => {
      expect(component.totalTrendRevenue()).toBe(12000 + 18000 + 9500 + 22000 + 15000);
    });

    it('should return 0 for totalTrendRevenue when stats is null', () => {
      component.stats.set(null);
      expect(component.totalTrendRevenue()).toBe(0);
    });

    it('should compute trendChartBars with geometry for each trend day', () => {
      const bars = component.trendChartBars();
      expect(bars.length).toBeGreaterThan(0);
      bars.forEach(b => {
        expect(b.centerX).toBeGreaterThan(0);
        expect(b.width).toBeGreaterThan(0);
        expect(b.index).toBeGreaterThanOrEqual(0);
      });
    });

    it('should mark days with revenue as hasRevenue=true', () => {
      const bars = component.trendChartBars();
      const withRevenue = bars.filter(b => b.hasRevenue);
      expect(withRevenue.length).toBeGreaterThan(0);
    });

    it('should return empty trendChartBars when stats is null', () => {
      component.stats.set(null);
      expect(component.trendChartBars()).toEqual([]);
    });

    it('should return empty trendSplinePath when stats is null', () => {
      component.stats.set(null);
      expect(component.trendSplinePath()).toBe('');
    });

    it('should return non-empty trendSplinePath when trend has revenue data', () => {
      expect(component.trendSplinePath()).toContain('M ');
    });

    it('should return empty trendAreaPath when stats is null', () => {
      component.stats.set(null);
      expect(component.trendAreaPath()).toBe('');
    });

    it('should return closed trendAreaPath with Z when data present', () => {
      expect(component.trendAreaPath()).toContain('Z');
    });

    it('should identify peakTrendDay correctly', () => {
      const peak = component.peakTrendDay();
      expect(peak).not.toBeNull();
      expect(peak!.revenue).toBe(22000);
    });

    it('should return null peakTrendDay when stats is null', () => {
      component.stats.set(null);
      expect(component.peakTrendDay()).toBeNull();
    });

    it('should return 50 from getTrendBarLeftPct for an unknown date', () => {
      expect(component.getTrendBarLeftPct('1900-01-01')).toBe(50);
    });

    it('should return a valid percentage from getTrendBarLeftPct for a known date', () => {
      const bars = component.trendChartBars();
      if (bars.length > 0) {
        const pct = component.getTrendBarLeftPct(bars[0].date);
        expect(pct).toBeGreaterThan(0);
        expect(pct).toBeLessThanOrEqual(100);
      }
    });

    it('should set and clear hoveredTrendBar signal', () => {
      const trend = component.sevenDayTrend();
      expect(component.hoveredTrendBar()).toBeNull();
      if (trend.length > 0) {
        component.hoveredTrendBar.set(trend[0]);
        expect(component.hoveredTrendBar()?.date).toBe(trend[0].date);
      }
      component.hoveredTrendBar.set(null);
      expect(component.hoveredTrendBar()).toBeNull();
    });
  });
});
