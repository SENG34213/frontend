import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of, throwError } from 'rxjs';

import { AdminLoyaltyComponent } from './admin-loyalty.component';
import { LoyaltyAdminService } from './loyalty-admin.service';
import { UserAdminService } from '../users/user-admin.service';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import {
  LoyaltyRules,
  AdminLoyaltyStatsResponse,
  PagedLoyaltyAccounts,
  LoyaltyTransactionDto
} from '../../../shared/models';

describe('AdminLoyaltyComponent', () => {
  let component: AdminLoyaltyComponent;
  let fixture: ComponentFixture<AdminLoyaltyComponent>;
  let mockLoyaltyService: jasmine.SpyObj<LoyaltyAdminService>;
  let mockUserAdminService: jasmine.SpyObj<UserAdminService>;
  let mockToastService: jasmine.SpyObj<ToastService>;
  let mockRouter: jasmine.SpyObj<Router>;

  const mockStats: AdminLoyaltyStatsResponse = {
    totalAccounts: 6,
    totalPointsInCirculation: 9500,
    totalPointsAwardedAllTime: 14000,
    totalPointsRedeemedAllTime: 4500,
    accountsByTier: { BRONZE: 2, SILVER: 2, GOLD: 1, VIP: 1 }
  };

  const mockPagedAccounts: PagedLoyaltyAccounts = {
    content: [
      {
        id: 'la-1',
        userId: 'usr-1',
        userName: 'Kasun Perera',
        userEmail: 'kasun@gmail.com',
        phoneNumber: '+94771234567',
        pointsBalance: 1450,
        tier: 'SILVER',
        equivalentDiscountLkr: 1450,
        totalEarnedAllTime: 2200,
        totalRedeemedAllTime: 750,
        updatedAt: '2026-10-12T14:20:00Z'
      }
    ],
    totalElements: 1,
    totalPages: 1,
    size: 10,
    number: 0
  };

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

  const mockTransactions: LoyaltyTransactionDto[] = [
    {
      id: 'tx-1',
      userId: 'usr-1',
      userName: 'Kasun Perera',
      points: 150,
      type: 'EARN',
      description: 'Session completion reward',
      createdAt: '2026-10-14T18:00:00Z'
    }
  ];

  beforeEach(async () => {
    mockLoyaltyService = jasmine.createSpyObj('LoyaltyAdminService', [
      'getStats',
      'getAccounts',
      'getRules',
      'updateRules',
      'adjustPoints',
      'getTransactions'
    ]);
    mockToastService = jasmine.createSpyObj('ToastService', ['success', 'error', 'info', 'warning']);
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);
    mockUserAdminService = jasmine.createSpyObj('UserAdminService', ['getUsers', 'getUserById']);
    mockUserAdminService.getUsers.and.returnValue(of({ content: [], totalElements: 0, totalPages: 0, size: 200, number: 0 }));
    mockUserAdminService.getUserById.and.returnValue(of(null as unknown as import('../../../shared/models').UserSummaryResponse));

    mockLoyaltyService.getStats.and.returnValue(of(mockStats));
    mockLoyaltyService.getAccounts.and.returnValue(of(mockPagedAccounts));
    mockLoyaltyService.getRules.and.returnValue(of(mockRules));
    mockLoyaltyService.updateRules.and.returnValue(of(mockRules));
    mockLoyaltyService.getTransactions.and.returnValue(of(mockTransactions));
    mockLoyaltyService.adjustPoints.and.returnValue(of({
      userId: 'usr-1',
      adjustedPoints: 100,
      newBalance: 1550,
      newTier: 'SILVER',
      reason: 'Bonus gesture',
      timestamp: '2026-10-15T12:00:00Z'
    }));

    await TestBed.configureTestingModule({
      imports: [AdminLoyaltyComponent],
      providers: [
        { provide: LoyaltyAdminService, useValue: mockLoyaltyService },
        { provide: UserAdminService, useValue: mockUserAdminService },
        { provide: ToastService, useValue: mockToastService },
        { provide: Router, useValue: mockRouter },
        {
          provide: ActivatedRoute,
          useValue: {
            queryParams: of({ tab: 'accounts' })
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AdminLoyaltyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the admin loyalty component', () => {
    expect(component).toBeTruthy();
  });

  it('should load initial stats, accounts, rules, and audit logs', () => {
    expect(mockLoyaltyService.getStats).toHaveBeenCalled();
    expect(mockLoyaltyService.getAccounts).toHaveBeenCalled();
    expect(mockLoyaltyService.getRules).toHaveBeenCalled();
    expect(mockLoyaltyService.getTransactions).toHaveBeenCalled();

    expect(component.stats()).toEqual(mockStats);
    expect(component.accounts().length).toBe(1);
    expect(component.rules()).toEqual(mockRules);
  });

  it('should switch tabs and update route query parameters', () => {
    component.selectTab('rules');
    expect(component.activeTab()).toBe('rules');
    expect(mockRouter.navigate).toHaveBeenCalledWith([], jasmine.objectContaining({
      queryParams: jasmine.objectContaining({ tab: 'rules' })
    }));
  });

  it('should handle pagination changes', () => {
    component.onPageChange(2);
    expect(component.page()).toBe(2);
    expect(mockRouter.navigate).toHaveBeenCalledWith([], jasmine.objectContaining({
      queryParams: jasmine.objectContaining({ page: 2 })
    }));
  });

  it('should open and close the manual adjust modal', () => {
    component.openAdjustModal(mockPagedAccounts.content[0]);
    expect(component.isAdjustModalOpen()).toBeTrue();
    expect(component.targetAccount()).toEqual(mockPagedAccounts.content[0]);

    component.closeAdjustModal();
    expect(component.isAdjustModalOpen()).toBeFalse();
    expect(component.targetAccount()).toBeNull();
  });

  it('should validate adjustment inputs before executing', () => {
    component.openAdjustModal(mockPagedAccounts.content[0]);

    // Zero points
    component.adjustPointsInput.set(0);
    component.confirmAdjustPoints();
    expect(component.adjustError()).toContain('valid non-zero point value');

    // Missing reason
    component.adjustPointsInput.set(200);
    component.adjustReasonInput.set('');
    component.confirmAdjustPoints();
    expect(component.adjustError()).toContain('descriptive reason is required');
  });

  it('should adjust points successfully and display toast', () => {
    component.openAdjustModal(mockPagedAccounts.content[0]);
    component.adjustPointsInput.set(100);
    component.adjustReasonInput.set('VIP player loyalty award');

    component.confirmAdjustPoints();

    expect(mockLoyaltyService.adjustPoints).toHaveBeenCalledWith({
      userId: 'usr-1',
      points: 100,
      reason: 'VIP player loyalty award'
    });
    expect(mockToastService.success).toHaveBeenCalledWith('Points Adjusted', jasmine.any(String));
    expect(component.isAdjustModalOpen()).toBeFalse();
  });

  it('should save updated loyalty rules', () => {
    component.ruleAmountPerPoint.set(120);
    component.rulePointValueLkr.set(1.5);
    component.saveRules();

    expect(mockLoyaltyService.updateRules).toHaveBeenCalledWith(jasmine.objectContaining({
      amountPerPoint: 120,
      pointValueLkr: 1.5
    }));
    expect(mockToastService.success).toHaveBeenCalledWith('Rules Saved', jasmine.any(String));
  });

  it('should map tier badges accurately', () => {
    expect(component.getTierBadgeVariant('VIP')).toBe('danger');
    expect(component.getTierBadgeVariant('GOLD')).toBe('warning');
    expect(component.getTierBadgeVariant('SILVER')).toBe('primary');
    expect(component.getTierBadgeVariant('BRONZE')).toBe('neutral');
  });

  it('should handle account loading errors gracefully', () => {
    mockLoyaltyService.getAccounts.and.returnValue(throwError(() => new Error('DB connection failed')));
    component.loadAccounts();

    expect(component.errorMessage()).toContain('DB connection failed');
    expect(component.isLoading()).toBeFalse();
  });
});
