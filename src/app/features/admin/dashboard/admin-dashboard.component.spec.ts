import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { provideRouter } from '@angular/router';
import { AdminDashboardComponent } from './admin-dashboard.component';
import { AdminService } from '../../../core/services/admin.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import {
  AdminBookingStatsResponse,
  AdminPaymentStatsResponse,
  AdminUserStatsResponse,
  AdminTournamentStatsResponse,
  AdminBookingRow,
  AdminOverviewStats
} from '../../../shared/models';

describe('AdminDashboardComponent', () => {
  let component: AdminDashboardComponent;
  let fixture: ComponentFixture<AdminDashboardComponent>;
  let adminServiceSpy: jasmine.SpyObj<AdminService>;
  let toastServiceSpy: jasmine.SpyObj<ToastService>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;

  const mockBookingStats: AdminBookingStatsResponse = {
    todayTotalBookings: 18,
    todayConfirmedBookings: 14,
    todayCancelledBookings: 2,
    activeSessionsNow: 5,
    monthTotalBookings: 248,
    allTimeTotalBookings: 1840,
    allTimeCancelled: 64
  };

  const mockPaymentStats: AdminPaymentStatsResponse = {
    todayRevenue: 28650,
    monthRevenue: 485200,
    totalPaymentsSuccess: 1720,
    totalPaymentsFailed: 42,
    revenueTrend: [
      { date: '2026-10-14', revenue: 25000 },
      { date: '2026-10-15', revenue: 28650 }
    ]
  };

  const mockUserStats: AdminUserStatsResponse = {
    totalUsers: 840,
    activeUsers: 812,
    deactivatedUsers: 28,
    customerCount: 824,
    adminCount: 16,
    newUsersToday: 6,
    newUsersThisMonth: 94
  };

  const mockTournamentStats: AdminTournamentStatsResponse = {
    totalTournaments: 12,
    upcomingTournaments: 3,
    ongoingTournaments: 1,
    completedTournaments: 7,
    cancelledTournaments: 1,
    totalParticipants: 218
  };

  const mockRecentBookings: AdminBookingRow[] = [
    {
      id: 'bk-101',
      userId: 'usr-1',
      stationId: 'st-01',
      stationCode: 'PS5-01',
      stationType: 'PS5',
      hourlyRate: 650,
      startTime: '2026-10-15T11:00:00Z',
      endTime: '2026-10-15T13:00:00Z',
      durationMinutes: 120,
      status: 'IN_PROGRESS',
      source: 'ONLINE',
      payableAmount: 1300,
      totalAmount: 1300,
      createdAt: '2026-10-15T09:30:00Z'
    },
    {
      id: 'bk-102',
      userId: 'usr-2',
      stationId: 'st-04',
      stationCode: 'PC-04',
      stationType: 'PC_ESPORTS',
      hourlyRate: 800,
      startTime: '2026-10-15T11:30:00Z',
      endTime: '2026-10-15T14:30:00Z',
      durationMinutes: 180,
      status: 'CONFIRMED',
      source: 'WALK_IN',
      payableAmount: 2400,
      totalAmount: 2400,
      createdAt: '2026-10-15T11:15:00Z'
    }
  ];

  const mockOverview: AdminOverviewStats = {
    bookings: mockBookingStats,
    payments: mockPaymentStats,
    users: mockUserStats,
    tournaments: mockTournamentStats
  };

  beforeEach(async () => {
    adminServiceSpy = jasmine.createSpyObj('AdminService', [
      'getOverviewStats',
      'getRecentBookings',
      'getPaymentStats',
      'getBookingsExportUrl',
      'getPaymentsExportUrl'
    ]);
    toastServiceSpy = jasmine.createSpyObj('ToastService', ['show', 'success', 'error', 'warning', 'info']);
    authServiceSpy = jasmine.createSpyObj('AuthService', ['currentUser', 'role', 'isAdmin']);

    adminServiceSpy.getOverviewStats.and.returnValue(of(mockOverview));
    adminServiceSpy.getRecentBookings.and.returnValue(of(mockRecentBookings));
    adminServiceSpy.getPaymentStats.and.returnValue(of(mockPaymentStats));
    adminServiceSpy.getBookingsExportUrl.and.returnValue('/api/bookings/admin/export.csv');
    adminServiceSpy.getPaymentsExportUrl.and.returnValue('/api/payments/admin/export.csv');

    await TestBed.configureTestingModule({
      imports: [AdminDashboardComponent],
      providers: [
        provideRouter([]),
        { provide: AdminService, useValue: adminServiceSpy },
        { provide: ToastService, useValue: toastServiceSpy },
        { provide: AuthService, useValue: authServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AdminDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and load dashboard overview data successfully', () => {
    expect(component).toBeTruthy();
    expect(component.isLoading()).toBeFalse();
    expect(component.bookingStats()?.activeSessionsNow).toBe(5);
    expect(component.paymentStats()?.todayRevenue).toBe(28650);
    expect(component.userStats()?.totalUsers).toBe(840);
    expect(component.tournamentStats()?.totalTournaments).toBe(12);
    expect(component.recentBookings().length).toBe(2);
  });

  it('should render KPI card values correctly', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const revEl = compiled.querySelector('#kpi-today-revenue');
    expect(revEl?.textContent).toContain('28,650.00');

    const sessionsEl = compiled.querySelector('#kpi-active-sessions');
    expect(sessionsEl?.textContent).toContain('5');

    const usersEl = compiled.querySelector('#kpi-total-users');
    expect(usersEl?.textContent).toContain('840');

    const tourneysEl = compiled.querySelector('#kpi-tournaments-active');
    expect(tourneysEl?.textContent).toContain('4'); // 3 upcoming + 1 ongoing
  });

  it('should filter recent bookings by status or channel', () => {
    // Default is ALL
    expect(component.filteredBookings().length).toBe(2);

    // IN_PROGRESS filter
    component.setBookingFilter('IN_PROGRESS');
    expect(component.filteredBookings().length).toBe(1);
    expect(component.filteredBookings()[0].id).toBe('bk-101');

    // WALK_IN filter
    component.setBookingFilter('WALK_IN');
    expect(component.filteredBookings().length).toBe(1);
    expect(component.filteredBookings()[0].id).toBe('bk-102');

    // ONLINE filter
    component.setBookingFilter('ONLINE');
    expect(component.filteredBookings().length).toBe(1);
    expect(component.filteredBookings()[0].source).toBe('ONLINE');

    // Reset to ALL
    component.setBookingFilter('ALL');
    expect(component.filteredBookings().length).toBe(2);
  });

  it('should switch trend days and update payment stats', () => {
    component.setTrendDays(30);
    expect(component.selectedTrendDays()).toBe(30);
    expect(adminServiceSpy.getPaymentStats).toHaveBeenCalledWith(30);
  });

  it('should compute chart summary properties correctly', () => {
    expect(component.totalTrendRevenue()).toBe(53650);
    expect(component.averageDailyRevenue()).toBe(26825);
    expect(component.maxRevenue()).toBe(28650);
  });

  it('should trigger manual refresh and show toast notification', () => {
    component.triggerRefresh();
    expect(adminServiceSpy.getOverviewStats).toHaveBeenCalled();
    expect(toastServiceSpy.info).toHaveBeenCalledWith('Dashboard metrics refreshed');
  });

  it('should handle API failure gracefully with plain-English error state', () => {
    adminServiceSpy.getOverviewStats.and.returnValue(throwError(() => new Error('Service unavailable')));
    component.loadDashboardData();
    fixture.detectChanges();

    expect(component.errorMessage()).toContain('Failed to load dashboard metrics');
    expect(component.isLoading()).toBeFalse();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.error-banner')).toBeTruthy();
  });

  it('should trigger CSV export downloads in new window', () => {
    spyOn(window, 'open');
    component.exportBookings();
    expect(window.open).toHaveBeenCalledWith('/api/bookings/admin/export.csv', '_blank');

    component.exportPayments();
    expect(window.open).toHaveBeenCalledWith('/api/payments/admin/export.csv', '_blank');
  });

  it('should map booking status to correct badge variant', () => {
    expect(component.getStatusBadgeVariant('IN_PROGRESS')).toBe('available');
    expect(component.getStatusBadgeVariant('CONFIRMED')).toBe('primary');
    expect(component.getStatusBadgeVariant('COMPLETED')).toBe('neutral');
    expect(component.getStatusBadgeVariant('CANCELLED')).toBe('occupied');
    expect(component.getStatusBadgeVariant('UNKNOWN')).toBe('warning');
  });

  it('should format times and dates safely', () => {
    expect(component.formatTime('')).toBe('--:--');
    expect(component.formatDate('2026-10-15')).toBe('10/15');
    expect(component.formatDate('')).toBe('');
  });
});
