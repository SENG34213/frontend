import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { forkJoin } from 'rxjs';
import { LoyaltyService } from '../../core/services/loyalty.service';
import { AuthService } from '../../core/services/auth.service';
import { LoyaltyBalanceDto, LoyaltyTransactionDto, LoyaltyTier } from '../../shared/models/loyalty.model';
import { CardComponent } from '../../shared/ui/card/card.component';
import { BadgeComponent, BadgeVariant } from '../../shared/ui/badge/badge.component';
import { PaginationComponent } from '../../shared/ui/pagination/pagination.component';
import { SkeletonComponent } from '../../shared/ui/skeleton/skeleton.component';
import { EmptyStateComponent } from '../../shared/ui/empty-state/empty-state.component';

export interface FormattedTransaction extends LoyaltyTransactionDto {
  formattedDate: string;
  badgeVariant: BadgeVariant;
  pointsDisplay: string;
  isPositive: boolean;
}

@Component({
  selector: 'gc-loyalty',
  standalone: true,
  imports: [
    CommonModule,
    CardComponent,
    BadgeComponent,
    PaginationComponent,
    SkeletonComponent,
    EmptyStateComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './loyalty.component.html',
  styleUrl: './loyalty.component.scss'
})
export class LoyaltyComponent implements OnInit {
  private readonly loyaltyService = inject(LoyaltyService);
  private readonly authService = inject(AuthService);

  readonly balance = signal<LoyaltyBalanceDto | null>(null);
  readonly transactions = signal<FormattedTransaction[]>([]);
  readonly currentPage = signal<number>(0);
  readonly totalPages = signal<number>(1);
  readonly totalElements = signal<number>(0);
  readonly pageSize = signal<number>(10);

  readonly isLoading = signal<boolean>(true);
  readonly hasError = signal<boolean>(false);

  ngOnInit(): void {
    this.loadInitialData();
  }

  loadInitialData(): void {
    this.isLoading.set(true);
    this.hasError.set(false);

    const userId = this.authService.getUserId() || undefined;

    forkJoin({
      balance: this.loyaltyService.getBalance(userId),
      history: this.loyaltyService.getHistory(userId, this.currentPage(), this.pageSize())
    }).subscribe({
      next: ({ balance, history }) => {
        this.balance.set(balance);
        this.totalPages.set(history.totalPages);
        this.totalElements.set(history.totalElements);
        this.transactions.set((history.content || []).map((t) => this.formatTransaction(t)));
        this.isLoading.set(false);
      },
      error: () => {
        this.hasError.set(true);
        this.isLoading.set(false);
      }
    });
  }

  loadHistoryPage(page: number): void {
    this.currentPage.set(page);
    const userId = this.authService.getUserId() || undefined;

    this.loyaltyService.getHistory(userId, page, this.pageSize()).subscribe({
      next: (history) => {
        this.totalPages.set(history.totalPages);
        this.totalElements.set(history.totalElements);
        this.transactions.set((history.content || []).map((t) => this.formatTransaction(t)));
      },
      error: () => {
        // Non-fatal if page flip fails, keep existing
      }
    });
  }

  onPageChange(page: number): void {
    this.loadHistoryPage(page);
  }

  getTierBadgeVariant(tier?: LoyaltyTier): BadgeVariant {
    switch (tier) {
      case 'VIP':
      case 'GOLD':
        return 'warning';
      case 'SILVER':
        return 'accent';
      case 'BRONZE':
      default:
        return 'info';
    }
  }

  private formatTransaction(t: LoyaltyTransactionDto): FormattedTransaction {
    const isPositive = t.points >= 0;
    const pointsDisplay = isPositive ? `+${t.points}` : `${t.points}`;

    let badgeVariant: BadgeVariant = 'neutral';
    switch (t.type) {
      case 'EARN':
        badgeVariant = 'success';
        break;
      case 'REDEEM':
        badgeVariant = 'danger';
        break;
      case 'ADMIN_ADJUST':
        badgeVariant = 'accent';
        break;
      case 'REVERT':
        badgeVariant = 'warning';
        break;
      default:
        badgeVariant = isPositive ? 'success' : 'danger';
        break;
    }

    let formattedDate = t.createdAt;
    try {
      const d = new Date(t.createdAt);
      formattedDate = d.toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      // keep fallback
    }

    return {
      ...t,
      formattedDate,
      badgeVariant,
      pointsDisplay,
      isPositive
    };
  }
}
