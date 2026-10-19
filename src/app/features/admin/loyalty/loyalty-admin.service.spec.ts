import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { LoyaltyAdminService } from './loyalty-admin.service';
import { ApiService } from '../../../core/services/api.service';
import { LoyaltyRules, AdminLoyaltyStatsResponse, PagedLoyaltyAccounts, LoyaltyTransactionDto } from '../../../shared/models';

describe('LoyaltyAdminService', () => {
  let service: LoyaltyAdminService;
  let apiSpy: jasmine.SpyObj<ApiService>;

  const mockRules: LoyaltyRules = {
    id: 'lr-1',
    amountPerPoint: 100,
    pointValueLkr: 1.0,
    minRedeemPoints: 50,
    redeemStep: 10,
    maxDiscountPercent: 50,
    reservationTimeoutMinutes: 15,
    silverThreshold: 500,
    silverMultiplier: 1.25,
    goldThreshold: 1500,
    goldMultiplier: 1.5
  };

  beforeEach(() => {
    apiSpy = jasmine.createSpyObj('ApiService', ['get', 'post', 'put']);
    TestBed.configureTestingModule({
      providers: [
        LoyaltyAdminService,
        { provide: ApiService, useValue: apiSpy }
      ]
    });
    service = TestBed.inject(LoyaltyAdminService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should get loyalty rules via GET', (done) => {
    apiSpy.get.and.returnValue(of(mockRules));

    service.getRules().subscribe(rules => {
      expect(rules.amountPerPoint).toBe(100);
      expect(apiSpy.get).toHaveBeenCalledWith('/loyalty/admin/rules');
      done();
    });
  });

  it('should update loyalty rules via PUT', (done) => {
    apiSpy.put.and.returnValue(of(mockRules));

    service.updateRules(mockRules).subscribe(rules => {
      expect(rules.pointValueLkr).toBe(1.0);
      expect(apiSpy.put).toHaveBeenCalledWith('/loyalty/admin/rules', mockRules);
      done();
    });
  });

  it('should adjust points via POST', (done) => {
    const adjReq = { userId: 'usr-1', points: 100, reason: 'Bonus' };
    const adjResp = {
      userId: 'usr-1',
      adjustedPoints: 100,
      newBalance: 1100,
      newTier: 'SILVER',
      reason: 'Bonus',
      timestamp: '2026-10-19T00:00:00Z'
    };

    apiSpy.post.and.returnValue(of(adjResp));

    service.adjustPoints(adjReq).subscribe(res => {
      expect(res.newBalance).toBe(1100);
      expect(apiSpy.post).toHaveBeenCalledWith('/loyalty/admin/adjust', adjReq);
      done();
    });
  });

  it('should get loyalty stats via GET', (done) => {
    const stats: AdminLoyaltyStatsResponse = {
      totalAccounts: 50,
      totalPointsInCirculation: 10000,
      totalPointsAwardedAllTime: 25000,
      totalPointsRedeemedAllTime: 15000,
      accountsByTier: { BRONZE: 30, SILVER: 15, GOLD: 5, VIP: 0 }
    };

    apiSpy.get.and.returnValue(of(stats));

    service.getStats().subscribe(res => {
      expect(res.totalAccounts).toBe(50);
      expect(apiSpy.get).toHaveBeenCalledWith('/loyalty/admin/stats');
      done();
    });
  });

  it('should get accounts with filters', (done) => {
    const mockAccounts: PagedLoyaltyAccounts = {
      content: [],
      totalElements: 0,
      totalPages: 0,
      number: 0,
      size: 10
    };

    apiSpy.get.and.returnValue(of(mockAccounts));

    service.getAccounts({ page: 0, size: 10, search: 'kasun', tier: 'SILVER' }).subscribe(res => {
      expect(res).toEqual(mockAccounts);
      expect(apiSpy.get).toHaveBeenCalledWith('/loyalty/admin/accounts', jasmine.any(Object));
      done();
    });
  });

  it('should get transactions via GET', (done) => {
    const mockTxs: LoyaltyTransactionDto[] = [
      { id: 'tx-1', userId: 'usr-1', points: 50, type: 'EARN', description: 'Points earned', createdAt: '2026-10-19T00:00:00Z' }
    ];

    apiSpy.get.and.returnValue(of(mockTxs));

    service.getTransactions().subscribe(txs => {
      expect(txs.length).toBe(1);
      expect(apiSpy.get).toHaveBeenCalledWith('/loyalty/admin/transactions');
      done();
    });
  });
});
