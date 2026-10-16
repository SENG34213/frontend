import { Injectable, inject } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Observable, catchError } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { MockDataService } from '../../../core/services/mock/mock-data.service';
import { environment } from '../../../../environments/environment';
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
  private readonly mock = inject(MockDataService);

  private readonly adminBase = '/loyalty/admin';

  /**
   * Get current loyalty tier & redemption rules.
   * Maps to GET /api/loyalty/admin/rules
   */
  getRules(): Observable<LoyaltyRules> {
    if (environment.useMocks) {
      return this.mock.getAdminLoyaltyRules();
    }

    return this.api.get<LoyaltyRules>(`${this.adminBase}/rules`).pipe(
      catchError(() => this.mock.getAdminLoyaltyRules())
    );
  }

  /**
   * Update loyalty program rules.
   * Maps to PUT /api/loyalty/admin/rules
   */
  updateRules(rules: UpdateLoyaltyRulesRequest): Observable<LoyaltyRules> {
    if (environment.useMocks) {
      return this.mock.updateAdminLoyaltyRules(rules);
    }

    return this.api.put<LoyaltyRules>(`${this.adminBase}/rules`, rules).pipe(
      catchError(() => this.mock.updateAdminLoyaltyRules(rules))
    );
  }

  /**
   * Manually adjust a customer's loyalty point balance with an audit reason.
   * Maps to POST /api/loyalty/admin/adjust
   */
  adjustPoints(req: AdjustPointsRequest): Observable<AdminAdjustmentResponse> {
    if (environment.useMocks) {
      return this.mock.adjustUserLoyaltyPoints(req);
    }

    return this.api.post<AdminAdjustmentResponse>(`${this.adminBase}/adjust`, req).pipe(
      catchError(() => this.mock.adjustUserLoyaltyPoints(req))
    );
  }

  /**
   * Get aggregate loyalty program stats.
   * Maps to GET /api/loyalty/admin/stats
   */
  getStats(): Observable<AdminLoyaltyStatsResponse> {
    if (environment.useMocks) {
      return this.mock.getAdminLoyaltyStats();
    }

    return this.api.get<AdminLoyaltyStatsResponse>(`${this.adminBase}/stats`).pipe(
      catchError(() => this.mock.getAdminLoyaltyStats())
    );
  }

  /**
   * Get paginated customer loyalty accounts list.
   * Maps to GET /api/loyalty/admin/accounts
   */
  getAccounts(filter?: LoyaltyAccountFilter): Observable<PagedLoyaltyAccounts> {
    if (environment.useMocks) {
      return this.mock.getAdminLoyaltyAccounts(filter);
    }

    let params = new HttpParams();
    if (filter?.page !== undefined) params = params.set('page', String(filter.page));
    if (filter?.size !== undefined) params = params.set('size', String(filter.size));
    if (filter?.search) params = params.set('search', filter.search);
    if (filter?.tier) params = params.set('tier', filter.tier);

    return this.api.get<PagedLoyaltyAccounts>(`${this.adminBase}/accounts`, { params }).pipe(
      catchError(() => this.mock.getAdminLoyaltyAccounts(filter))
    );
  }

  /**
   * Get recent loyalty transaction history (audit log).
   * Maps to GET /api/loyalty/admin/transactions
   */
  getTransactions(): Observable<LoyaltyTransactionDto[]> {
    if (environment.useMocks) {
      return this.mock.getAdminLoyaltyTransactions();
    }

    return this.api.get<LoyaltyTransactionDto[]>(`${this.adminBase}/transactions`).pipe(
      catchError(() => this.mock.getAdminLoyaltyTransactions())
    );
  }
}
