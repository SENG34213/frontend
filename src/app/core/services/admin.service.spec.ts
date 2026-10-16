import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { AdminService } from './admin.service';
import { ApiService } from './api.service';
import { MockDataService } from './mock/mock-data.service';
import {
  AdminBookingStatsResponse,
  AdminPaymentStatsResponse,
  AdminUserStatsResponse,
  AdminTournamentStatsResponse,
  AdminBookingRow
} from '../../shared/models';

describe('AdminService', () => {
  let service: AdminService;
  let apiSpy: jasmine.SpyObj<ApiService>;
  let mockSpy: jasmine.SpyObj<MockDataService>;

  const mockBookingStats: AdminBookingStatsResponse = {
    todayTotalBookings: 10,
    todayConfirmedBookings: 8,
    todayCancelledBookings: 1,
    activeSessionsNow: 3,
    monthTotalBookings: 150,
    allTimeTotalBookings: 900,
    allTimeCancelled: 30
  };

  const mockPaymentStats: AdminPaymentStatsResponse = {
    todayRevenue: 15000,
    monthRevenue: 300000,
    totalPaymentsSuccess: 800,
    totalPaymentsFailed: 10,
    revenueTrend: [{ date: '2026-10-14', revenue: 15000 }]
  };

  const mockUserStats: AdminUserStatsResponse = {
    totalUsers: 500,
    activeUsers: 490,
    deactivatedUsers: 10,
    customerCount: 480,
    adminCount: 20,
    newUsersToday: 4,
    newUsersThisMonth: 50
  };

  const mockTournamentStats: AdminTournamentStatsResponse = {
    totalTournaments: 8,
    upcomingTournaments: 2,
    ongoingTournaments: 1,
    completedTournaments: 5,
    cancelledTournaments: 0,
    totalParticipants: 128
  };

  const mockBookings: AdminBookingRow[] = [
    {
      id: 'bk-1',
      userId: 'u1',
      stationId: 'st1',
      stationCode: 'PS5-01',
      startTime: '2026-10-15T10:00:00Z',
      endTime: '2026-10-15T12:00:00Z',
      status: 'CONFIRMED',
      source: 'ONLINE',
      createdAt: '2026-10-15T08:00:00Z'
    }
  ];

  beforeEach(() => {
    apiSpy = jasmine.createSpyObj('ApiService', ['get', 'post', 'patch', 'delete']);
    mockSpy = jasmine.createSpyObj('MockDataService', [
      'getAdminBookingStats',
      'getAdminPaymentStats',
      'getAdminUserStats',
      'getAdminTournamentStats',
      'getAdminRecentBookings'
    ]);

    mockSpy.getAdminBookingStats.and.returnValue(of(mockBookingStats));
    mockSpy.getAdminPaymentStats.and.returnValue(of(mockPaymentStats));
    mockSpy.getAdminUserStats.and.returnValue(of(mockUserStats));
    mockSpy.getAdminTournamentStats.and.returnValue(of(mockTournamentStats));
    mockSpy.getAdminRecentBookings.and.returnValue(of(mockBookings));

    TestBed.configureTestingModule({
      providers: [
        AdminService,
        { provide: ApiService, useValue: apiSpy },
        { provide: MockDataService, useValue: mockSpy }
      ]
    });

    service = TestBed.inject(AdminService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should retrieve booking stats from API or fallback to mock', (done) => {
    apiSpy.get.and.returnValue(of(mockBookingStats));
    service.getBookingStats().subscribe((res) => {
      expect(res.todayTotalBookings).toBe(10);
      done();
    });
  });

  it('should fallback to mock booking stats when API fails', (done) => {
    apiSpy.get.and.returnValue(throwError(() => new Error('Network error')));
    service.getBookingStats().subscribe((res) => {
      expect(res.todayTotalBookings).toBe(10);
      expect(mockSpy.getAdminBookingStats).toHaveBeenCalled();
      done();
    });
  });

  it('should retrieve payment stats with trend', (done) => {
    apiSpy.get.and.returnValue(of(mockPaymentStats));
    service.getPaymentStats(14).subscribe((res) => {
      expect(res.todayRevenue).toBe(15000);
      expect(res.revenueTrend.length).toBe(1);
      done();
    });
  });

  it('should retrieve user stats', (done) => {
    apiSpy.get.and.returnValue(of(mockUserStats));
    service.getUserStats().subscribe((res) => {
      expect(res.totalUsers).toBe(500);
      done();
    });
  });

  it('should retrieve tournament stats', (done) => {
    apiSpy.get.and.returnValue(of(mockTournamentStats));
    service.getTournamentStats().subscribe((res) => {
      expect(res.totalTournaments).toBe(8);
      done();
    });
  });

  it('should retrieve recent bookings array', (done) => {
    apiSpy.get.and.returnValue(of({ content: mockBookings }));
    service.getRecentBookings(5).subscribe((res) => {
      expect(res.length).toBe(1);
      expect(res[0].id).toBe('bk-1');
      done();
    });
  });

  it('should load combined overview stats with forkJoin', (done) => {
    apiSpy.get.and.callFake(((url: string) => {
      if (url.includes('/bookings/admin/stats')) return of(mockBookingStats);
      if (url.includes('/payments/admin/stats')) return of(mockPaymentStats);
      if (url.includes('/users/admin/stats')) return of(mockUserStats);
      if (url.includes('/tournaments/admin/stats')) return of(mockTournamentStats);
      return of({});
    }) as any);

    service.getOverviewStats().subscribe((overview) => {
      expect(overview.bookings.activeSessionsNow).toBe(3);
      expect(overview.payments.todayRevenue).toBe(15000);
      expect(overview.users.totalUsers).toBe(500);
      expect(overview.tournaments.totalParticipants).toBe(128);
      done();
    });
  });

  it('should construct CSV export URLs', () => {
    expect(service.getBookingsExportUrl()).toContain('/bookings/admin/export.csv');
    expect(service.getPaymentsExportUrl()).toContain('/payments/admin/export.csv');
  });
});
