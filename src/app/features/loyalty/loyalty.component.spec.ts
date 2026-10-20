import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { LoyaltyComponent } from './loyalty.component';
import { LoyaltyService, PagedLoyaltyTransactions } from '../../core/services/loyalty.service';
import { AuthService } from '../../core/services/auth.service';
import { LoyaltyBalanceDto, LoyaltyTransactionDto } from '../../shared/models/loyalty.model';

describe('LoyaltyComponent', () => {
  let component: LoyaltyComponent;
  let fixture: ComponentFixture<LoyaltyComponent>;
  let loyaltyServiceSpy: jasmine.SpyObj<LoyaltyService>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;

  const mockBalance: LoyaltyBalanceDto = {
    userId: 'usr-1',
    pointsBalance: 1250,
    tier: 'GOLD',
    equivalentDiscountLkr: 1250
  };

  const mockTransactions: LoyaltyTransactionDto[] = [
    {
      id: 'tx-1',
      userId: 'usr-1',
      points: 150,
      description: 'Session completion reward (PS5-01, 2 hrs)',
      type: 'EARN',
      createdAt: '2026-10-18T10:00:00Z'
    },
    {
      id: 'tx-2',
      userId: 'usr-1',
      points: -200,
      description: 'Checkout discount redeemed (Booking #B-902)',
      type: 'REDEEM',
      createdAt: '2026-10-17T15:30:00Z'
    }
  ];

  const mockPaged: PagedLoyaltyTransactions = {
    content: mockTransactions,
    totalElements: 2,
    totalPages: 1,
    number: 0,
    size: 10
  };

  beforeEach(async () => {
    loyaltyServiceSpy = jasmine.createSpyObj('LoyaltyService', ['getBalance', 'getHistory']);
    authServiceSpy = jasmine.createSpyObj('AuthService', ['getUserId']);
    authServiceSpy.getUserId.and.returnValue('usr-1');

    loyaltyServiceSpy.getBalance.and.returnValue(of(mockBalance));
    loyaltyServiceSpy.getHistory.and.returnValue(of(mockPaged));

    await TestBed.configureTestingModule({
      imports: [LoyaltyComponent],
      providers: [
        provideRouter([]),
        { provide: LoyaltyService, useValue: loyaltyServiceSpy },
        { provide: AuthService, useValue: authServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LoyaltyComponent);
    component = fixture.componentInstance;
  });

  it('should create loyalty component', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should load balance and transaction history on init', () => {
    fixture.detectChanges();

    expect(component.isLoading()).toBeFalse();
    expect(component.balance()).toEqual(mockBalance);
    expect(component.transactions().length).toBe(2);

    const pointsEl = fixture.nativeElement.querySelector('.points-value');
    expect(pointsEl.textContent.trim()).toBe('1,250');

    const discountEl = fixture.nativeElement.querySelector('.discount-amount');
    expect(discountEl.textContent.trim()).toContain('1,250.00');

    const rows = fixture.nativeElement.querySelectorAll('.gc-table tbody tr');
    expect(rows.length).toBe(2);
    expect(rows[0].textContent).toContain('+150');
    expect(rows[1].textContent).toContain('-200');
  });

  it('should format positive points with + and green class, negative points without +', () => {
    fixture.detectChanges();

    const pointsBadges = fixture.nativeElement.querySelectorAll('.points-badge');
    expect(pointsBadges[0].classList).toContain('points-positive');
    expect(pointsBadges[0].textContent.trim()).toBe('+150');

    expect(pointsBadges[1].classList).toContain('points-negative');
    expect(pointsBadges[1].textContent.trim()).toBe('-200');
  });

  it('should handle pagination changes', () => {
    fixture.detectChanges();
    loyaltyServiceSpy.getHistory.and.returnValue(of({
      ...mockPaged,
      number: 1
    }));

    component.onPageChange(1);
    expect(component.currentPage()).toBe(1);
    expect(loyaltyServiceSpy.getHistory).toHaveBeenCalledWith('usr-1', 1, 10);
  });

  it('should display empty state when there are no transactions', () => {
    loyaltyServiceSpy.getHistory.and.returnValue(of({
      content: [],
      totalElements: 0,
      totalPages: 1,
      number: 0,
      size: 10
    }));
    fixture.detectChanges();

    expect(component.transactions().length).toBe(0);
    const emptyState = fixture.nativeElement.querySelector('gc-empty-state');
    expect(emptyState).toBeTruthy();
  });

  it('should handle error state and allow retry', () => {
    loyaltyServiceSpy.getBalance.and.returnValue(throwError(() => new Error('API failure')));
    fixture.detectChanges();

    expect(component.hasError()).toBeTrue();
    expect(component.isLoading()).toBeFalse();

    loyaltyServiceSpy.getBalance.and.returnValue(of(mockBalance));
    loyaltyServiceSpy.getHistory.and.returnValue(of(mockPaged));
    component.loadInitialData();
    fixture.detectChanges();

    expect(component.hasError()).toBeFalse();
    expect(component.balance()).toEqual(mockBalance);
  });
});
