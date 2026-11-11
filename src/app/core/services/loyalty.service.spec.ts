import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { LoyaltyService } from './loyalty.service';
import { ApiService } from './api.service';
import { MockDataService } from './mock/mock-data.service';
import { AuthService } from './auth.service';
import { LoyaltyBalanceDto, LoyaltyTransactionDto } from '../../shared/models/loyalty.model';
import { environment } from '../../../environments/environment';

describe('LoyaltyService', () => {
  let service: LoyaltyService;
  let apiSpy: jasmine.SpyObj<ApiService>;
  let mockDataSpy: jasmine.SpyObj<MockDataService>;
  let authSpy: jasmine.SpyObj<AuthService>;

  const mockBalance: LoyaltyBalanceDto = {
    userId: 'usr-customer-1',
    pointsBalance: 1250,
    tier: 'SILVER',
    equivalentDiscountLkr: 1250,
    silverThreshold: 1000,
    goldThreshold: 3000,
    silverMultiplier: 1.25,
    goldMultiplier: 1.50
  };

  const mockTransaction: LoyaltyTransactionDto = {
    id: 'tx-1',
    userId: 'usr-customer-1',
    points: 100,
    description: 'Booking reward',
    type: 'EARN',
    createdAt: '2026-10-18T10:00:00Z'
  };

  beforeEach(() => {
    apiSpy = jasmine.createSpyObj('ApiService', ['get']);
    mockDataSpy = jasmine.createSpyObj('MockDataService', ['getLoyaltyBalance', 'getMyLoyaltyHistory']);
    authSpy = jasmine.createSpyObj('AuthService', ['getUserId']);
    authSpy.getUserId.and.returnValue('usr-customer-1');

    TestBed.configureTestingModule({
      providers: [
        LoyaltyService,
        { provide: ApiService, useValue: apiSpy },
        { provide: MockDataService, useValue: mockDataSpy },
        { provide: AuthService, useValue: authSpy }
      ]
    });

    service = TestBed.inject(LoyaltyService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getBalance()', () => {
    it('should call api.get and resolve SILVER for 1250 points with default thresholds', (done) => {
      const orig = environment.useMocks;
      environment.useMocks = false;
      apiSpy.get.and.returnValue(of({
        userId: 'usr-customer-1',
        pointsBalance: 1250,
        tier: 'BRONZE',
        equivalentDiscount: 1250,
        silverThreshold: 1000,
        goldThreshold: 3000
      }));

      service.getBalance('usr-customer-1').subscribe((res) => {
        expect(apiSpy.get).toHaveBeenCalledWith('/loyalty/balance/usr-customer-1');
        expect(res.pointsBalance).toBe(1250);
        expect(res.tier).toBe('SILVER');
        environment.useMocks = orig;
        done();
      });
    });

    it('should correctly resolve SILVER tier for 1624 points (1000 <= 1624 <= 3000)', (done) => {
      const orig = environment.useMocks;
      environment.useMocks = false;
      apiSpy.get.and.returnValue(of({
        userId: 'usr-customer-1',
        pointsBalance: 1624,
        tier: 'BRONZE',
        equivalentDiscount: 1624,
        silverThreshold: 1000,
        goldThreshold: 3000
      }));

      service.getBalance('usr-customer-1').subscribe((res) => {
        expect(res.pointsBalance).toBe(1624);
        expect(res.tier).toBe('SILVER');
        environment.useMocks = orig;
        done();
      });
    });

    it('should dynamically adapt tier when admin changes thresholds from backend', (done) => {
      const orig = environment.useMocks;
      environment.useMocks = false;
      // Admin changed silver threshold to 2000: 1624 is now BRONZE
      apiSpy.get.and.returnValue(of({
        userId: 'usr-customer-1',
        pointsBalance: 1624,
        tier: 'BRONZE',
        equivalentDiscount: 1624,
        silverThreshold: 2000,
        goldThreshold: 5000
      }));

      service.getBalance('usr-customer-1').subscribe((res) => {
        expect(res.pointsBalance).toBe(1624);
        expect(res.tier).toBe('BRONZE');
        expect(res.silverThreshold).toBe(2000);
        expect(res.goldThreshold).toBe(5000);
        environment.useMocks = orig;
        done();
      });
    });

    it('should fallback to mockData when api.get fails', (done) => {
      const orig = environment.useMocks;
      environment.useMocks = false;
      apiSpy.get.and.returnValue(throwError(() => new Error('API error')));
      mockDataSpy.getLoyaltyBalance.and.returnValue(of(mockBalance));

      service.getBalance('usr-customer-1').subscribe((res) => {
        expect(mockDataSpy.getLoyaltyBalance).toHaveBeenCalledWith('usr-customer-1');
        expect(res).toEqual(mockBalance);
        environment.useMocks = orig;
        done();
      });
    });

    it('should call mockData when useMocks is true', (done) => {
      const orig = environment.useMocks;
      environment.useMocks = true;
      mockDataSpy.getLoyaltyBalance.and.returnValue(of(mockBalance));

      service.getBalance('usr-customer-1').subscribe((res) => {
        expect(mockDataSpy.getLoyaltyBalance).toHaveBeenCalledWith('usr-customer-1');
        expect(res).toEqual(mockBalance);
        environment.useMocks = orig;
        done();
      });
    });
  });

  describe('getHistory()', () => {
    it('should call api.get and map paged transaction history', (done) => {
      const orig = environment.useMocks;
      environment.useMocks = false;
      apiSpy.get.and.returnValue(of({
        content: [{
          id: 'tx-1',
          userId: 'usr-customer-1',
          points: 100,
          description: 'Booking reward',
          type: 'EARN',
          createdAt: '2026-10-18T10:00:00Z'
        }],
        totalElements: 1,
        totalPages: 1,
        number: 0,
        size: 10
      }));

      service.getHistory('usr-customer-1', 0, 10).subscribe((res) => {
        expect(apiSpy.get).toHaveBeenCalledWith('/loyalty/history/usr-customer-1?page=0&size=10');
        expect(res.content.length).toBe(1);
        expect(res.content[0].points).toBe(100);
        environment.useMocks = orig;
        done();
      });
    });

    it('should fallback to mockData when api.get fails', (done) => {
      const orig = environment.useMocks;
      environment.useMocks = false;
      apiSpy.get.and.returnValue(throwError(() => new Error('API error')));
      mockDataSpy.getMyLoyaltyHistory.and.returnValue(of({
        content: [mockTransaction],
        totalElements: 1,
        totalPages: 1,
        number: 0,
        size: 10
      }));

      service.getHistory('usr-customer-1', 0, 10).subscribe((res) => {
        expect(mockDataSpy.getMyLoyaltyHistory).toHaveBeenCalledWith('usr-customer-1', 0, 10);
        expect(res.content[0]).toEqual(mockTransaction);
        environment.useMocks = orig;
        done();
      });
    });
  });
});
