import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map } from 'rxjs';
import { ApiService } from './api.service';
import { MockDataService } from './mock/mock-data.service';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';
import {
  LoyaltyBalanceDto,
  LoyaltyTransactionDto,
  LoyaltyTier
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
      return this.mock.getLoyaltyBalance(uid);
    }

    return this.api.get<BackendLoyaltyAccountResponse>(`/loyalty/balance/${uid}`).pipe(
      map((res) => ({
        userId: res.userId,
        pointsBalance: Number(res.pointsBalance || 0),
        tier: (res.tier || 'BRONZE') as LoyaltyTier,
        equivalentDiscountLkr: Number(res.equivalentDiscount ?? res.pointsBalance ?? 0)
      })),
      catchError(() => this.mock.getLoyaltyBalance(uid))
    );
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
