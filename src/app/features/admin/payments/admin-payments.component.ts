import {
  Component, OnInit, OnDestroy, signal, computed, inject, ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

import { PaymentAdminService } from './payment-admin.service';
import { UserAdminService } from '../users/user-admin.service';
import {
  PaymentResponse,
  PagedPayments,
  PaymentFilter,
  PaymentStatus,
  PaymentMethod,
  ReferenceType,
  AdminPaymentStatsResponse
} from '../../../shared/models';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { CardComponent } from '../../../shared/ui/card/card.component';
import { BadgeComponent } from '../../../shared/ui/badge/badge.component';
import { ModalComponent } from '../../../shared/ui/modal/modal.component';
import { PaginationComponent } from '../../../shared/ui/pagination/pagination.component';
import { SkeletonComponent } from '../../../shared/ui/skeleton/skeleton.component';
import { EmptyStateComponent } from '../../../shared/ui/empty-state/empty-state.component';

@Component({
  selector: 'gc-admin-payments',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    DatePipe,
    ButtonComponent,
    CardComponent,
    BadgeComponent,
    ModalComponent,
    PaginationComponent,
    SkeletonComponent,
    EmptyStateComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-payments.component.html',
  styleUrl: './admin-payments.component.scss'
})
export class AdminPaymentsComponent implements OnInit, OnDestroy {
  private readonly paymentAdminService = inject(PaymentAdminService);
  private readonly userAdminService = inject(UserAdminService);
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroy$ = new Subject<void>();
  private readonly userCache = new Map<string, { fullName: string; email: string }>();

  // ── Signals ────────────────────────────────────────────────────────────────
  readonly payments = signal<PaymentResponse[]>([]);
  readonly stats = signal<AdminPaymentStatsResponse | null>(null);

  readonly sevenDayTrend = computed(() => {
    const raw = this.stats()?.revenueTrend ?? [];
    if (raw.length === 0) return [];

    const map = new Map<string, number>();
    let maxDateStr = '';
    for (const item of raw) {
      map.set(item.date, Number(item.revenue) || 0);
      if (!maxDateStr || item.date > maxDateStr) {
        maxDateStr = item.date;
      }
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const anchorStr = maxDateStr > todayStr ? maxDateStr : todayStr;
    const anchor = new Date(anchorStr);

    const result: { date: string; revenue: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(anchor);
      d.setDate(d.getDate() - i);
      const dateKey = d.toISOString().split('T')[0];
      result.push({
        date: dateKey,
        revenue: map.get(dateKey) ?? 0
      });
    }
    return result;
  });

  readonly isLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly actionInFlight = signal(false);

  // Pagination & Filtering
  readonly currentPage = signal(0);
  readonly pageSize = signal(12);
  readonly totalElements = signal(0);
  readonly totalPages = signal(1);

  readonly filterStatus = signal<PaymentStatus | ''>('');
  readonly filterMethod = signal<PaymentMethod | ''>('');
  readonly filterReferenceType = signal<ReferenceType | ''>('');
  readonly filterFrom = signal('');
  readonly filterTo = signal('');

  // Detail drawer
  readonly detailDrawerOpen = signal(false);
  readonly selectedPayment = signal<PaymentResponse | null>(null);

  // Refund confirm modal
  readonly refundModalOpen = signal(false);
  readonly targetRefund = signal<PaymentResponse | null>(null);

  // ── Option Arrays ──────────────────────────────────────────────────────────
  readonly statusOptions: { value: PaymentStatus | ''; label: string }[] = [
    { value: '', label: 'All Statuses' },
    { value: 'PENDING', label: 'Pending' },
    { value: 'SUCCESS', label: 'Successful' },
    { value: 'FAILED', label: 'Failed' },
    { value: 'REFUNDED', label: 'Refunded' }
  ];

  readonly methodOptions: { value: PaymentMethod | ''; label: string }[] = [
    { value: '', label: 'All Methods' },
    { value: 'CARD', label: 'Card' },
    { value: 'ONLINE', label: 'Online / E-Pay' },
    { value: 'CASH', label: 'Cash' },
    { value: 'LOYALTY_POINTS', label: 'Loyalty Points' }
  ];

  readonly refTypeOptions: { value: ReferenceType | ''; label: string }[] = [
    { value: '', label: 'All Types' },
    { value: 'BOOKING', label: 'Bookings' },
    { value: 'TOURNAMENT', label: 'Tournaments' }
  ];

  // ── Lifecycle ──────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      if (params['status']) this.filterStatus.set(params['status'] as PaymentStatus);
      if (params['method']) this.filterMethod.set(params['method'] as PaymentMethod);
      if (params['refType']) this.filterReferenceType.set(params['refType'] as ReferenceType);
      if (params['from']) this.filterFrom.set(params['from']);
      if (params['to']) this.filterTo.set(params['to']);
      if (params['page']) this.currentPage.set(Math.max(0, parseInt(params['page'], 10) || 0));
    });

    this.loadStats();
    this.prefillUserCache();
    this.loadPayments();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private prefillUserCache(): void {
    this.userAdminService.getUsers({ size: 100, page: 0 }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        (res.content || []).forEach(u => {
          this.userCache.set(u.id, { fullName: u.fullName, email: u.email });
        });
        this.enrichPaymentsWithUsers();
      },
      error: () => {}
    });
  }

  // ── API Operations ─────────────────────────────────────────────────────────
  loadStats(): void {
    this.paymentAdminService.getPaymentStats()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => this.stats.set(res),
        error: () => { /* non-critical */ }
      });
  }

  loadPayments(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    const filter: PaymentFilter = {
      status: this.filterStatus() || undefined,
      method: this.filterMethod() || undefined,
      referenceType: this.filterReferenceType() || undefined,
      from: this.filterFrom() || undefined,
      to: this.filterTo() || undefined,
      page: this.currentPage(),
      size: this.pageSize()
    };

    this.paymentAdminService.getPayments(filter)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (page: PagedPayments) => {
          const enriched = page.content.map(p => {
            const cached = this.userCache.get(p.userId);
            return {
              ...p,
              customerName: p.customerName || cached?.fullName,
              customerEmail: p.customerEmail || cached?.email
            };
          });
          this.payments.set(enriched);
          this.totalElements.set(page.totalElements);
          this.totalPages.set(Math.max(1, page.totalPages));
          this.isLoading.set(false);
          this.resolveMissingUsers(page.content);
        },
        error: (err: { message?: string }) => {
          this.errorMessage.set(err?.message || 'Failed to load payments');
          this.isLoading.set(false);
          this.toast.error('Could not load payment records');
        }
      });
  }

  private resolveMissingUsers(payments: PaymentResponse[]): void {
    const missingIds = [...new Set(payments.map(p => p.userId).filter(id => id && !this.userCache.has(id)))];
    missingIds.forEach(id => {
      this.userAdminService.getUserById(id).pipe(takeUntil(this.destroy$)).subscribe({
        next: (u) => {
          if (u) {
            this.userCache.set(id, { fullName: u.fullName, email: u.email });
            this.enrichPaymentsWithUsers();
          }
        },
        error: () => {}
      });
    });
  }

  private enrichPaymentsWithUsers(): void {
    this.payments.update(list => list.map(p => {
      const cached = this.userCache.get(p.userId);
      if (cached && (!p.customerName || !p.customerEmail)) {
        return {
          ...p,
          customerName: p.customerName || cached.fullName,
          customerEmail: p.customerEmail || cached.email
        };
      }
      return p;
    }));
  }

  getCustomerName(payment: PaymentResponse): string {
    if (payment.customerName && payment.customerName !== 'Unknown') return payment.customerName;
    const cached = this.userCache.get(payment.userId);
    if (cached?.fullName) return cached.fullName;
    if (payment.userId) return `Customer (${payment.userId.slice(0, 8)}…)`;
    return 'Customer';
  }

  getCustomerEmail(payment: PaymentResponse): string {
    if (payment.customerEmail) return payment.customerEmail;
    const cached = this.userCache.get(payment.userId);
    return cached?.email || '';
  }

  // ── Detail Drawer ──────────────────────────────────────────────────────────
  openDetail(payment: PaymentResponse): void {
    this.selectedPayment.set(payment);
    this.detailDrawerOpen.set(true);
  }

  closeDetail(): void {
    this.detailDrawerOpen.set(false);
  }

  onOverlayClick(e: MouseEvent): void {
    if (e.target === e.currentTarget) {
      this.closeDetail();
    }
  }

  // ── Refund ────────────────────────────────────────────────────────────────
  promptRefund(payment: PaymentResponse, event?: Event): void {
    if (event) event.stopPropagation();
    this.targetRefund.set(payment);
    this.refundModalOpen.set(true);
  }

  confirmRefund(): void {
    const payment = this.targetRefund();
    if (!payment) return;

    this.actionInFlight.set(true);
    this.paymentAdminService.refundPayment(payment.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updated) => {
          this.actionInFlight.set(false);
          this.refundModalOpen.set(false);
          this.toast.success(`Payment ${payment.receiptNumber || payment.id.slice(0, 8)} refunded successfully`);
          // Update in-place in the list
          this.payments.update(list =>
            list.map(p => p.id === updated.id ? updated : p)
          );
          this.loadStats();
          if (this.selectedPayment()?.id === updated.id) {
            this.selectedPayment.set(updated);
          }
        },
        error: (err: { message?: string }) => {
          this.actionInFlight.set(false);
          this.toast.error(err?.message || 'Refund failed. Please try again.');
        }
      });
  }

  // ── CSV Export ────────────────────────────────────────────────────────────
  exportCsv(): void {
    const rows = this.payments();
    if (rows.length === 0) {
      this.toast.warning('No payment records available to export');
      return;
    }

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
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gaming-castle-payments-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    this.toast.success(`Exported ${rows.length} payment records to CSV`);
  }

  // ── Filter Handlers ───────────────────────────────────────────────────────
  onStatusChange(status: string): void {
    this.filterStatus.set(status as PaymentStatus | '');
    this.currentPage.set(0);
    this.syncQueryParams();
    this.loadPayments();
  }

  onMethodChange(method: string): void {
    this.filterMethod.set(method as PaymentMethod | '');
    this.currentPage.set(0);
    this.syncQueryParams();
    this.loadPayments();
  }

  onRefTypeChange(type: string): void {
    this.filterReferenceType.set(type as ReferenceType | '');
    this.currentPage.set(0);
    this.syncQueryParams();
    this.loadPayments();
  }

  onFromChange(val: string): void {
    this.filterFrom.set(val);
    this.currentPage.set(0);
    this.syncQueryParams();
    this.loadPayments();
  }

  onToChange(val: string): void {
    this.filterTo.set(val);
    this.currentPage.set(0);
    this.syncQueryParams();
    this.loadPayments();
  }

  clearFilters(): void {
    this.filterStatus.set('');
    this.filterMethod.set('');
    this.filterReferenceType.set('');
    this.filterFrom.set('');
    this.filterTo.set('');
    this.currentPage.set(0);
    this.syncQueryParams();
    this.loadPayments();
  }

  onPageChange(page: number): void {
    this.currentPage.set(page);
    this.syncQueryParams();
    this.loadPayments();
  }

  private syncQueryParams(): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        status: this.filterStatus() || null,
        method: this.filterMethod() || null,
        refType: this.filterReferenceType() || null,
        from: this.filterFrom() || null,
        to: this.filterTo() || null,
        page: this.currentPage() > 0 ? this.currentPage() : null
      },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  statusBadgeVariant(status: PaymentStatus): 'success' | 'danger' | 'warning' | 'primary' | 'neutral' {
    switch (status) {
      case 'SUCCESS': return 'success';
      case 'FAILED': return 'danger';
      case 'REFUNDED': return 'warning';
      case 'PENDING': return 'primary';
      default: return 'neutral';
    }
  }

  methodIcon(method?: PaymentMethod | null): string {
    switch (method) {
      case 'CARD': return '💳';
      case 'ONLINE': return '🌐';
      case 'CASH': return '💵';
      case 'LOYALTY_POINTS': return '⭐';
      default: return '💳';
    }
  }

  getTrendBarHeight(revenue: number): number {
    const trend = this.sevenDayTrend();
    const max = Math.max(...trend.map(d => d.revenue), 1);
    if (!revenue || revenue <= 0) return 6;
    return Math.max(12, Math.round((revenue / max) * 100));
  }

  formatDate(isoDate?: string): string {
    if (!isoDate) return '—';
    const d = new Date(isoDate);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  formatDateTime(isoDate?: string): string {
    if (!isoDate) return '—';
    const d = new Date(isoDate);
    return d.toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }

  canRefund(payment: PaymentResponse): boolean {
    return payment.status === 'SUCCESS';
  }
}
