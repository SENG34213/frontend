import {
  Component, OnInit, OnDestroy, signal, computed, inject, ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

import { LoyaltyAdminService } from './loyalty-admin.service';
import { UserAdminService } from '../users/user-admin.service';
import {
  LoyaltyRules,
  UpdateLoyaltyRulesRequest,
  AdjustPointsRequest,
  AdminLoyaltyStatsResponse,
  LoyaltyAccountResponse,
  LoyaltyAccountFilter,
  LoyaltyTier,
  LoyaltyTransactionDto
} from '../../../shared/models';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { BadgeComponent } from '../../../shared/ui/badge/badge.component';
import { ModalComponent } from '../../../shared/ui/modal/modal.component';
import { PaginationComponent } from '../../../shared/ui/pagination/pagination.component';
import { SkeletonComponent } from '../../../shared/ui/skeleton/skeleton.component';
import { EmptyStateComponent } from '../../../shared/ui/empty-state/empty-state.component';

@Component({
  selector: 'gc-admin-loyalty',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    DatePipe,
    ButtonComponent,
    BadgeComponent,
    ModalComponent,
    PaginationComponent,
    SkeletonComponent,
    EmptyStateComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-loyalty.component.html',
  styleUrl: './admin-loyalty.component.scss'
})
export class AdminLoyaltyComponent implements OnInit, OnDestroy {
  private readonly loyaltyService = inject(LoyaltyAdminService);
  private readonly userAdminService = inject(UserAdminService);
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroy$ = new Subject<void>();

  private readonly userMap = new Map<string, { fullName: string; email: string; phoneNumber?: string }>();

  // ── Signals ────────────────────────────────────────────────────────────────
  readonly activeTab = signal<'accounts' | 'rules' | 'audit'>('accounts');
  readonly stats = signal<AdminLoyaltyStatsResponse | null>(null);
  readonly accounts = signal<LoyaltyAccountResponse[]>([]);
  readonly rules = signal<LoyaltyRules | null>(null);
  readonly transactions = signal<LoyaltyTransactionDto[]>([]);

  readonly isLoading = signal<boolean>(false);
  readonly isSavingRules = signal<boolean>(false);
  readonly isAdjusting = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  // Accounts Pagination & Filters
  readonly page = signal<number>(0);
  readonly pageSize = signal<number>(10);
  readonly totalElements = signal<number>(0);
  readonly totalPages = signal<number>(1);
  readonly searchTerm = signal<string>('');
  readonly selectedTier = signal<LoyaltyTier | ''>('');

  // Manual Adjust Modal
  readonly isAdjustModalOpen = signal<boolean>(false);
  readonly targetAccount = signal<LoyaltyAccountResponse | null>(null);
  readonly adjustPointsInput = signal<number>(100);
  readonly adjustReasonInput = signal<string>('');
  readonly adjustError = signal<string | null>(null);

  // Rules Form Fields
  readonly ruleAmountPerPoint = signal<number>(100);
  readonly rulePointValueLkr = signal<number>(1.0);
  readonly ruleMinRedeemPoints = signal<number>(50);
  readonly ruleRedeemStep = signal<number>(10);
  readonly ruleMaxDiscountPercent = signal<number>(50);
  readonly ruleReservationTimeout = signal<number>(15);
  readonly ruleSilverThreshold = signal<number>(500);
  readonly ruleSilverMultiplier = signal<number>(1.25);
  readonly ruleGoldThreshold = signal<number>(1500);
  readonly ruleGoldMultiplier = signal<number>(1.5);

  // Preview adjusted balance
  readonly previewNewBalance = computed(() => {
    const acc = this.targetAccount();
    if (!acc) return 0;
    return Math.max(0, acc.pointsBalance + (Number(this.adjustPointsInput()) || 0));
  });

  ngOnInit(): void {
    this.loadUsers();

    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe(params => {
      const tabParam = params['tab'];
      if (tabParam === 'accounts' || tabParam === 'rules' || tabParam === 'audit') {
        this.activeTab.set(tabParam);
      }
      if (params['page']) this.page.set(Number(params['page']) || 0);
      if (params['search']) this.searchTerm.set(params['search']);
      if (params['tier']) this.selectedTier.set(params['tier']);

      this.loadStats();
      this.loadAccounts();
      this.loadRules();
      this.loadTransactions();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadUsers(): void {
    this.userAdminService.getUsers({ page: 0, size: 200 }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        if (res && res.content) {
          res.content.forEach((u) => {
            this.userMap.set(u.id, {
              fullName: u.fullName || u.email,
              email: u.email,
              phoneNumber: u.phoneNumber
            });
          });
          if (this.accounts().length > 0) {
            this.accounts.update((accs) => this.enrichAccounts(accs));
          }
        }
      },
      error: () => {}
    });
  }

  private enrichAccounts(rawAccounts: LoyaltyAccountResponse[]): LoyaltyAccountResponse[] {
    return (rawAccounts || []).map((acc: any) => {
      const uId = acc.userId || acc.id || '';
      const u = this.userMap.get(uId);
      const points = Number(acc.pointsBalance) || 0;
      const pointVal = Number(acc.pointValue) || 1;
      const equivDiscount = Number(acc.equivalentDiscount ?? acc.equivalentDiscountLkr ?? (points * pointVal)) || 0;
      const lifetime = Number(acc.lifetimeEarned ?? acc.totalEarnedAllTime ?? points) || 0;
      const redeemed = Number(acc.totalRedeemedAllTime ?? Math.max(0, lifetime - points)) || 0;

      return {
        ...acc,
        id: uId,
        userId: uId,
        userName: u?.fullName || acc.userName || (uId ? `Player (${uId.slice(0, 8)})` : 'Player'),
        userEmail: u?.email || acc.userEmail || (uId ? uId.slice(0, 14) + '...' : '—'),
        phoneNumber: u?.phoneNumber || acc.phoneNumber || '—',
        pointsBalance: points,
        tier: (acc.tier || 'BRONZE') as LoyaltyTier,
        equivalentDiscountLkr: equivDiscount,
        totalEarnedAllTime: lifetime,
        totalRedeemedAllTime: redeemed,
        updatedAt: acc.updatedAt || new Date().toISOString()
      };
    });
  }

  selectTab(tab: 'accounts' | 'rules' | 'audit'): void {
    if (this.activeTab() === tab) return;
    this.activeTab.set(tab);
    this.updateQueryParams();
  }

  updateQueryParams(): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        tab: this.activeTab(),
        page: this.page() > 0 ? this.page() : null,
        search: this.searchTerm() || null,
        tier: this.selectedTier() || null
      },
      queryParamsHandling: 'merge'
    });
  }

  loadStats(): void {
    this.loyaltyService.getStats().pipe(takeUntil(this.destroy$)).subscribe({
      next: data => this.stats.set(data),
      error: () => {}
    });
  }

  loadAccounts(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    const filter: LoyaltyAccountFilter = {
      page: this.page(),
      size: this.pageSize(),
      search: this.searchTerm() || undefined,
      tier: this.selectedTier() || undefined
    };

    this.loyaltyService.getAccounts(filter).pipe(takeUntil(this.destroy$)).subscribe({
      next: paged => {
        const enriched = this.enrichAccounts(paged.content || []);
        this.accounts.set(enriched);
        this.totalElements.set(paged.totalElements || enriched.length);
        this.totalPages.set(paged.totalPages || 1);
        this.isLoading.set(false);
      },
      error: err => {
        this.errorMessage.set(err?.message || 'Failed to load loyalty accounts.');
        this.isLoading.set(false);
      }
    });
  }

  loadRules(): void {
    this.loyaltyService.getRules().pipe(takeUntil(this.destroy$)).subscribe({
      next: r => {
        this.rules.set(r);
        this.ruleAmountPerPoint.set(r.amountPerPoint);
        this.rulePointValueLkr.set(r.pointValueLkr);
        this.ruleMinRedeemPoints.set(r.minRedeemPoints);
        this.ruleRedeemStep.set(r.redeemStep);
        this.ruleMaxDiscountPercent.set(r.maxDiscountPercent);
        this.ruleReservationTimeout.set(r.reservationTimeoutMinutes);
        this.ruleSilverThreshold.set(r.silverThreshold);
        this.ruleSilverMultiplier.set(r.silverMultiplier);
        this.ruleGoldThreshold.set(r.goldThreshold);
        this.ruleGoldMultiplier.set(r.goldMultiplier);
      },
      error: () => {}
    });
  }

  loadTransactions(): void {
    this.loyaltyService.getTransactions().pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        const rawList = Array.isArray(res) ? res : (res?.content || []);
        const enriched = rawList.map((tx: any) => {
          const u = this.userMap.get(tx.userId);
          return {
            ...tx,
            userName: u ? u.fullName : (tx.userName || (tx.userId ? `Player (${tx.userId.slice(0, 8)})` : 'Player'))
          };
        });
        this.transactions.set(enriched);
      },
      error: () => {}
    });
  }

  onPageChange(newPage: number): void {
    this.page.set(newPage);
    this.updateQueryParams();
  }

  applyAccountFilters(): void {
    this.page.set(0);
    this.updateQueryParams();
  }

  resetAccountFilters(): void {
    this.searchTerm.set('');
    this.selectedTier.set('');
    this.page.set(0);
    this.updateQueryParams();
  }

  // ── Manual Points Adjustment ──────────────────────────────────────────────
  openAdjustModal(account: LoyaltyAccountResponse): void {
    this.targetAccount.set(account);
    this.adjustPointsInput.set(100);
    this.adjustReasonInput.set('');
    this.adjustError.set(null);
    this.isAdjustModalOpen.set(true);
  }

  closeAdjustModal(): void {
    this.isAdjustModalOpen.set(false);
    this.targetAccount.set(null);
    this.adjustError.set(null);
  }

  confirmAdjustPoints(): void {
    const acc = this.targetAccount();
    if (!acc) return;

    const points = Number(this.adjustPointsInput());
    if (isNaN(points) || points === 0) {
      this.adjustError.set('Enter a valid non-zero point value.');
      return;
    }

    const reason = this.adjustReasonInput().trim();
    if (!reason || reason.length < 5) {
      this.adjustError.set('A descriptive reason is required (min 5 characters).');
      return;
    }

    this.isAdjusting.set(true);
    const req: AdjustPointsRequest = {
      userId: acc.userId || acc.id,
      points,
      reason
    };

    this.loyaltyService.adjustPoints(req).pipe(takeUntil(this.destroy$)).subscribe({
      next: res => {
        this.toast.success('Points Adjusted', `Updated balance for ${acc.userName} to ${res.newBalance} points.`);
        this.closeAdjustModal();
        this.isAdjusting.set(false);
        this.loadAccounts();
        this.loadStats();
        this.loadTransactions();
      },
      error: err => {
        this.toast.error('Adjustment Failed', err?.message || 'Could not adjust user points.');
        this.isAdjusting.set(false);
      }
    });
  }

  // ── Save Rules ─────────────────────────────────────────────────────────────
  saveRules(): void {
    if (this.ruleAmountPerPoint() <= 0 || this.rulePointValueLkr() <= 0) {
      this.toast.error('Invalid Rule Values', 'Rates must be positive numbers.');
      return;
    }

    this.isSavingRules.set(true);
    const updateReq: UpdateLoyaltyRulesRequest = {
      amountPerPoint: Number(this.ruleAmountPerPoint()),
      pointValueLkr: Number(this.rulePointValueLkr()),
      minRedeemPoints: Number(this.ruleMinRedeemPoints()),
      redeemStep: Number(this.ruleRedeemStep()),
      maxDiscountPercent: Number(this.ruleMaxDiscountPercent()),
      reservationTimeoutMinutes: Number(this.ruleReservationTimeout()),
      silverThreshold: Number(this.ruleSilverThreshold()),
      silverMultiplier: Number(this.ruleSilverMultiplier()),
      goldThreshold: Number(this.ruleGoldThreshold()),
      goldMultiplier: Number(this.ruleGoldMultiplier())
    };

    this.loyaltyService.updateRules(updateReq).pipe(takeUntil(this.destroy$)).subscribe({
      next: updated => {
        this.rules.set(updated);
        this.toast.success('Rules Saved', 'Loyalty calculation parameters updated across system.');
        this.isSavingRules.set(false);
      },
      error: err => {
        this.toast.error('Save Failed', err?.message || 'Could not update loyalty rules.');
        this.isSavingRules.set(false);
      }
    });
  }

  getTierBadgeVariant(tier: LoyaltyTier): 'success' | 'warning' | 'primary' | 'neutral' | 'danger' {
    switch (tier) {
      case 'VIP': return 'danger';
      case 'GOLD': return 'warning';
      case 'SILVER': return 'primary';
      case 'BRONZE': return 'neutral';
      default: return 'neutral';
    }
  }
}
