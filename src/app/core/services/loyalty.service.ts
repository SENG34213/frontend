import { Injectable, inject, signal, computed } from '@angular/core';
import { Observable, catchError, map, of, tap } from 'rxjs';
import { ApiService } from './api.service';
import { MockDataService } from './mock/mock-data.service';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';
import {
  LoyaltyBalanceDto,
  LoyaltyTransactionDto,
  LoyaltyTier,
  LoyaltyRules
} from '../../shared/models/loyalty.model';

export interface PagedLoyaltyTransactions {
  content: LoyaltyTransactionDto[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export interface BackendLoyaltyAccountResponse {
  userId: string;
  pointsBalance: number;
  lifetimeEarned?: number;
  tier: string;
  pointValue?: number;
  equivalentDiscount?: number;
  silverThreshold?: number;
  goldThreshold?: number;
  silverMultiplier?: number;
  goldMultiplier?: number;
}

export interface BackendTransactionHistoryResponse {
  id: string;
  userId: string;
  bookingId?: string;
  type?: string;
  status?: string;
  points: number;
  discountAmount?: number;
  description: string;
  balanceAfter?: number;
  createdAt: string;
}

export interface BackendPage<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

@Injectable({ providedIn: 'root' })
export class LoyaltyService {
  private readonly api = inject(ApiService);
  private readonly mock = inject(MockDataService);
  private readonly auth = inject(AuthService);

  readonly currentBalance = signal<LoyaltyBalanceDto | null>(null);
  readonly userTier = computed<LoyaltyTier>(() => this.currentBalance()?.tier || 'BRONZE');
  readonly userPoints = computed<number>(() => this.currentBalance()?.pointsBalance ?? 0);

  // Dynamic Tier & Multiplier thresholds configured by admin from backend
  readonly silverThreshold = signal<number>(1000);
  readonly goldThreshold = signal<number>(3000);
  readonly silverMultiplier = signal<number>(1.25);
  readonly goldMultiplier = signal<number>(1.50);
  readonly currentRules = signal<LoyaltyRules | null>(null);

  /**
   * Resolves the loyalty tier dynamically based on active rules:
   * - Under silverThreshold: BRONZE (< silverThreshold)
   * - Between silverThreshold and goldThreshold: SILVER (silverThreshold <= points <= goldThreshold)
   * - Above goldThreshold: GOLD (> goldThreshold)
   */
  calculateTier(points: number, silverThreshold?: number, goldThreshold?: number): LoyaltyTier {
    const silver = silverThreshold ?? this.silverThreshold();
    const gold = goldThreshold ?? this.goldThreshold();
    if (points > gold) return 'GOLD';
    if (points >= silver) return 'SILVER';
    return 'BRONZE';
  }

  /**
   * Retrieves active loyalty rules and tier thresholds from backend.
   * Maps to GET /api/loyalty/rules
   */
  getRules(): Observable<LoyaltyRules> {
    if (environment.useMocks) {
      const mockRules: LoyaltyRules = {
        amountPerPoint: 100,
        pointValueLkr: 0.5,
        minRedeemPoints: 100,
        redeemStep: 10,
        maxDiscountPercent: 50,
        reservationTimeoutMinutes: 15,
        silverThreshold: this.silverThreshold(),
        silverMultiplier: this.silverMultiplier(),
        goldThreshold: this.goldThreshold(),
        goldMultiplier: this.goldMultiplier()
      };
      return of(mockRules);
    }

    return this.api.get<LoyaltyRules>('/loyalty/rules').pipe(
      tap((rules) => {
        if (rules) {
          this.currentRules.set(rules);
          if (rules.silverThreshold != null) this.silverThreshold.set(Number(rules.silverThreshold));
          if (rules.goldThreshold != null) this.goldThreshold.set(Number(rules.goldThreshold));
          if (rules.silverMultiplier != null) this.silverMultiplier.set(Number(rules.silverMultiplier));
          if (rules.goldMultiplier != null) this.goldMultiplier.set(Number(rules.goldMultiplier));

          // If balance is already loaded, update its tier with new thresholds
          const cur = this.currentBalance();
          if (cur) {
            const updatedTier = this.calculateTier(cur.pointsBalance, Number(rules.silverThreshold), Number(rules.goldThreshold));
            this.currentBalance.set({
              ...cur,
              tier: updatedTier,
              silverThreshold: Number(rules.silverThreshold),
              goldThreshold: Number(rules.goldThreshold),
              silverMultiplier: Number(rules.silverMultiplier),
              goldMultiplier: Number(rules.goldMultiplier)
            });
          }
        }
      }),
      catchError(() => of({
        amountPerPoint: 100,
        pointValueLkr: 0.5,
        minRedeemPoints: 100,
        redeemStep: 10,
        maxDiscountPercent: 50,
        reservationTimeoutMinutes: 15,
        silverThreshold: this.silverThreshold(),
        silverMultiplier: this.silverMultiplier(),
        goldThreshold: this.goldThreshold(),
        goldMultiplier: this.goldMultiplier()
      }))
    );
  }

  /**
   * Invalidates any cached loyalty balance or history.
   */
  invalidateCache(): void {
    // Queries are live; method allows explicit cache invalidation across callers
  }

  /**
   * Retrieves loyalty balance and tier for a user.
   * Maps to GET /api/loyalty/balance/{userId}
   */
  getBalance(userId?: string): Observable<LoyaltyBalanceDto> {
    const uid = userId || this.auth.getUserId() || 'usr-customer-1';

    if (environment.useMocks) {
      return this.mock.getLoyaltyBalance(uid).pipe(
        map((dto) => {
          const tier = this.calculateTier(dto.pointsBalance, this.silverThreshold(), this.goldThreshold());
          return {
            ...dto,
            tier,
            silverThreshold: this.silverThreshold(),
            goldThreshold: this.goldThreshold(),
            silverMultiplier: this.silverMultiplier(),
            goldMultiplier: this.goldMultiplier()
          };
        }),
        tap((dto) => this.currentBalance.set(dto))
      );
    }

    return this.api.get<BackendLoyaltyAccountResponse>(`/loyalty/balance/${uid}`).pipe(
      map((res) => {
        const points = Number(res.pointsBalance || 0);
        const silver = res.silverThreshold != null ? Number(res.silverThreshold) : this.silverThreshold();
        const gold = res.goldThreshold != null ? Number(res.goldThreshold) : this.goldThreshold();
        const silverMult = res.silverMultiplier != null ? Number(res.silverMultiplier) : this.silverMultiplier();
        const goldMult = res.goldMultiplier != null ? Number(res.goldMultiplier) : this.goldMultiplier();

        this.silverThreshold.set(silver);
        this.goldThreshold.set(gold);
        this.silverMultiplier.set(silverMult);
        this.goldMultiplier.set(goldMult);

        // Dynamically calculate tier based on points and thresholds.
        // Under silver: Bronze, silver to gold: Silver, above gold: Gold.
        const tier = this.calculateTier(points, silver, gold);

        return {
          userId: res.userId,
          pointsBalance: points,
          lifetimeEarned: res.lifetimeEarned,
          tier,
          equivalentDiscountLkr: Number(res.equivalentDiscount ?? points ?? 0),
          silverThreshold: silver,
          goldThreshold: gold,
          silverMultiplier: silverMult,
          goldMultiplier: goldMult
        };
      }),
      tap((dto) => this.currentBalance.set(dto)),
      catchError(() =>
        this.mock.getLoyaltyBalance(uid).pipe(
          map((dto) => {
            const tier = this.calculateTier(dto.pointsBalance, this.silverThreshold(), this.goldThreshold());
            return {
              ...dto,
              tier,
              silverThreshold: this.silverThreshold(),
              goldThreshold: this.goldThreshold(),
              silverMultiplier: this.silverMultiplier(),
              goldMultiplier: this.goldMultiplier()
            };
          }),
          tap((dto) => this.currentBalance.set(dto))
        )
      )
    );
  }

  refreshBalance(userId?: string): Observable<LoyaltyBalanceDto> {
    return this.getBalance(userId);
  }

  /**
   * Retrieves paginated transaction history for a user.
   * Maps to GET /api/loyalty/history/{userId}?page={page}&size={size}
   */
  getHistory(userId?: string, page = 0, size = 10): Observable<PagedLoyaltyTransactions> {
    const uid = userId || this.auth.getUserId() || 'usr-customer-1';

    if (environment.useMocks) {
      return this.mock.getMyLoyaltyHistory(uid, page, size);
    }

    return this.api.get<BackendPage<BackendTransactionHistoryResponse> | BackendTransactionHistoryResponse[]>(
      `/loyalty/history/${uid}?page=${page}&size=${size}`
    ).pipe(
      map((res) => {
        if (Array.isArray(res)) {
          return {
            content: res.map((t) => this.mapTransaction(t)),
            totalElements: res.length,
            totalPages: Math.max(1, Math.ceil(res.length / size)),
            number: page,
            size
          };
        }

        const rawList = res?.content || [];
        return {
          content: rawList.map((t) => this.mapTransaction(t)),
          totalElements: res?.totalElements ?? rawList.length,
          totalPages: res?.totalPages ?? Math.max(1, Math.ceil(rawList.length / size)),
          number: res?.number ?? page,
          size: res?.size ?? size
        };
      }),
      catchError(() => this.mock.getMyLoyaltyHistory(uid, page, size))
    );
  }

  private mapTransaction(t: BackendTransactionHistoryResponse): LoyaltyTransactionDto {
    return {
      id: t.id,
      userId: t.userId,
      points: Number(t.points || 0),
      description: t.description || 'Loyalty Transaction',
      type: (t.type as LoyaltyTransactionDto['type']) || (t.points >= 0 ? 'EARN' : 'REDEEM'),
      createdAt: t.createdAt
    };
  }
}
