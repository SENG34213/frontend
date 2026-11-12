import { Injectable, inject } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { LoyaltyService } from '../../../core/services/loyalty.service';
import {
  LoyaltyRules,
  UpdateLoyaltyRulesRequest,
  AdjustPointsRequest,
  AdminAdjustmentResponse,
  AdminLoyaltyStatsResponse,
  PagedLoyaltyAccounts,
  LoyaltyAccountFilter,
  LoyaltyTransactionDto
} from '../../../shared/models';

@Injectable({ providedIn: 'root' })
export class LoyaltyAdminService {
  private readonly api = inject(ApiService);
  private readonly loyaltyService = inject(LoyaltyService);

  private readonly adminBase = '/loyalty/admin';

  /**
   * Get current loyalty tier & redemption rules.
   * Maps to GET /api/loyalty/admin/rules
   */
  getRules(): Observable<LoyaltyRules> {
    return this.api.get<LoyaltyRules>(`${this.adminBase}/rules`);
  }

  /**
   * Update loyalty program rules.
   * Maps to PUT /api/loyalty/admin/rules
   */
  updateRules(rules: UpdateLoyaltyRulesRequest): Observable<LoyaltyRules> {
    return this.api.put<LoyaltyRules>(`${this.adminBase}/rules`, rules).pipe(
      tap((saved) => {
        if (saved) {
          if (saved.silverThreshold != null) this.loyaltyService.silverThreshold.set(Number(saved.silverThreshold));
          if (saved.goldThreshold != null) this.goldServiceSet(saved);
          if (saved.silverMultiplier != null) this.loyaltyService.silverMultiplier.set(Number(saved.silverMultiplier));
          if (saved.goldMultiplier != null) this.loyaltyService.goldMultiplier.set(Number(saved.goldMultiplier));
          const cur = this.loyaltyService.currentBalance();
          if (cur) {
            const newTier = this.loyaltyService.calculateTier(
              cur.pointsBalance,
              Number(saved.silverThreshold),
              Number(saved.goldThreshold)
            );
            this.loyaltyService.currentBalance.set({
              ...cur,
              tier: newTier,
              silverThreshold: Number(saved.silverThreshold),
              goldThreshold: Number(saved.goldThreshold),
              silverMultiplier: Number(saved.silverMultiplier),
              goldMultiplier: Number(saved.goldMultiplier)
            });
          }
        }
      })
    );
  }

  private goldServiceSet(saved: LoyaltyRules): void {
    if (saved.goldThreshold != null) {
      this.loyaltyService.goldThreshold.set(Number(saved.goldThreshold));
    }
  }

  /**
   * Manually adjust a customer's loyalty point balance with an audit reason.
   * Maps to POST /api/loyalty/admin/adjust
   */
  adjustPoints(req: AdjustPointsRequest): Observable<AdminAdjustmentResponse> {
    return this.api.post<AdminAdjustmentResponse>(`${this.adminBase}/adjust`, req);
  }

  /**
   * Get aggregate loyalty program stats.
   * Maps to GET /api/loyalty/admin/stats
   */
  getStats(): Observable<AdminLoyaltyStatsResponse> {
    return this.api.get<AdminLoyaltyStatsResponse>(`${this.adminBase}/stats`);
  }

  /**
   * Get paginated customer loyalty accounts list.
   * Maps to GET /api/loyalty/admin/accounts
   */
  getAccounts(filter?: LoyaltyAccountFilter): Observable<PagedLoyaltyAccounts> {
    let params = new HttpParams();
    if (filter?.page !== undefined) params = params.set('page', String(filter.page));
    if (filter?.size !== undefined) params = params.set('size', String(filter.size));
    if (filter?.search) params = params.set('search', filter.search);
    if (filter?.tier) params = params.set('tier', filter.tier);

    return this.api.get<PagedLoyaltyAccounts>(`${this.adminBase}/accounts`, { params });
  }

  /**
   * Get recent loyalty transaction history (audit log).
   * Maps to GET /api/loyalty/admin/transactions
   */
  getTransactions(): Observable<LoyaltyTransactionDto[]> {
    return this.api.get<LoyaltyTransactionDto[]>(`${this.adminBase}/transactions`);
  }
}
