import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ReportAdminService } from './report-admin.service';
import { ApiService } from '../../../core/services/api.service';
import {
  AdminReportResponse,
  AdminPaymentStatsResponse,
  AdminBookingStatsResponse,
  AdminUserStatsResponse,
  Station
} from '../../../shared/models';

describe('ReportAdminService', () => {
  let service: ReportAdminService;
  let apiSpy: jasmine.SpyObj<ApiService>;

  beforeEach(() => {
    apiSpy = jasmine.createSpyObj('ApiService', ['get']);
    TestBed.configureTestingModule({
      providers: [
        ReportAdminService,
        { provide: ApiService, useValue: apiSpy }
      ]
    });
    service = TestBed.inject(ReportAdminService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getReport direct endpoint', () => {
    it('should return report directly if /admin/reports succeeds', (done) => {
      const mockReport: AdminReportResponse = {
        reportType: 'revenue',
        title: 'Revenue Report',
        generatedAt: '2026-10-19T00:00:00Z',
        dateRange: { startDate: '2026-10-01', endDate: '2026-10-19' },
        kpis: [],
        trend: [],
        breakdowns: [],
        tableColumns: [],
        tableData: []
      };

      apiSpy.get.and.returnValue(of(mockReport));

      service.getReport({ type: 'revenue', preset: '30days', startDate: '2026-10-01', endDate: '2026-10-19' }).subscribe(res => {
        expect(res).toEqual(mockReport);
        done();
      });
    });
  });

  describe('getLiveBackendReport - revenue', () => {
    it('should synthesize revenue report from payments microservice on fallback', (done) => {
      apiSpy.get.and.callFake(((url: string) => {
        if (url === '/admin/reports') return throwError(() => new Error('Not implemented'));
        if (url.includes('/payments/admin/stats')) {
          const stats: AdminPaymentStatsResponse = {
            todayRevenue: 5000,
            monthRevenue: 150000,
            totalPaymentsSuccess: 20,
            totalPaymentsFailed: 2,
            revenueTrend: [{ date: new Date().toISOString().split('T')[0], revenue: 5000 }]
          };
          return of(stats);
        }
        if (url.includes('/payments/admin/all')) {
          const todayStr = new Date().toISOString().split('T')[0];
          return of({
            content: [
              { id: 'p1', amount: 3000, status: 'SUCCESS', method: 'CARD', createdAt: `${todayStr}T10:00:00Z` },
              { id: 'p2', amount: 1500, status: 'SUCCESS', method: 'CASH', createdAt: `${todayStr}T11:00:00Z` },
              { id: 'p3', amount: 500, status: 'SUCCESS', method: 'ONLINE', createdAt: `${todayStr}T12:00:00Z` },
              { id: 'p4', amount: 2000, status: 'FAILED', method: 'CARD', createdAt: `${todayStr}T13:00:00Z` }
            ]
          });
        }
        return of({});
      }) as unknown as typeof apiSpy.get);

      service.getReport({ type: 'revenue', preset: 'today' }).subscribe(report => {
        expect(report.reportType).toBe('revenue');
        expect(report.kpis.length).toBe(4);
        expect(report.breakdowns.length).toBe(3);
        expect(report.tableData.length).toBeGreaterThan(0);
        done();
      });
    });

    it('should handle preset 7days and empty payment stats gracefully', (done) => {
      apiSpy.get.and.callFake(((url: string) => {
        if (url === '/admin/reports') return throwError(() => new Error('Not implemented'));
        if (url.includes('/payments/admin/stats')) return throwError(() => new Error('Stats unavailable'));
        if (url.includes('/payments/admin/all')) return of([]);
        return of({});
      }) as unknown as typeof apiSpy.get);

      service.getReport({ type: 'revenue', preset: '7days' }).subscribe(report => {
        expect(report.reportType).toBe('revenue');
        expect(report.trend.length).toBe(7);
        done();
      });
    });
  });

  describe('getLiveBackendReport - utilization', () => {
    it('should synthesize utilization report from stations and bookings microservices', (done) => {
      const mockStations: Station[] = [
        {
          id: 'st-1',
          stationNumber: 1,
          name: 'PS5 01',
          stationCode: 'CONSOLE-01',
          type: 'PS5',
          hourlyRate: 500,
          specifications: '',
          imageUrl: '',
          controllersCount: 2,
          active: true
        },
        {
          id: 'st-2',
          stationNumber: 2,
          name: 'VR 01',
          stationCode: 'VR-01',
          type: 'VR',
          hourlyRate: 800,
          specifications: '',
          imageUrl: '',
          controllersCount: 1,
          active: false
        }
      ];

      const todayStr = new Date().toISOString().split('T')[0];
      const mockBookings = [
        {
          id: 'b1',
          stationId: 'st-1',
          startTime: `${todayStr}T10:00:00Z`,
          endTime: `${todayStr}T12:00:00Z`,
          payableAmount: 1000,
          status: 'CONFIRMED'
        }
      ];

      apiSpy.get.and.callFake(((url: string) => {
        if (url === '/admin/reports') return throwError(() => new Error('Not implemented'));
        if (url === '/stations') return of(mockStations);
        if (url.includes('/bookings/admin/all')) return of({ content: mockBookings });
        if (url === '/bookings/admin/stats') {
          const bookingStats: AdminBookingStatsResponse = {
            todayTotalBookings: 1,
            todayConfirmedBookings: 1,
            todayCancelledBookings: 0,
            activeSessionsNow: 1,
            monthTotalBookings: 10,
            allTimeTotalBookings: 50,
            allTimeCancelled: 2
          };
          return of(bookingStats);
        }
        return of({});
      }) as unknown as typeof apiSpy.get);

      service.getReport({ type: 'utilization', preset: '30days' }).subscribe(report => {
        expect(report.reportType).toBe('utilization');
        expect(report.kpis.find(k => k.id === 'kpi-active-now')?.numericValue).toBe(1);
        expect(report.tableData.length).toBe(2);
        done();
      });
    });
  });

  describe('getLiveBackendReport - bookings', () => {
    it('should synthesize bookings report from booking stats and manifest', (done) => {
      const todayStr = new Date().toISOString().split('T')[0];
      apiSpy.get.and.callFake(((url: string) => {
        if (url === '/admin/reports') return throwError(() => new Error('Not implemented'));
        if (url === '/bookings/admin/stats') {
          const bookingStats: AdminBookingStatsResponse = {
            todayTotalBookings: 5,
            todayConfirmedBookings: 4,
            todayCancelledBookings: 1,
            activeSessionsNow: 2,
            monthTotalBookings: 25,
            allTimeTotalBookings: 120,
            allTimeCancelled: 5
          };
          return of(bookingStats);
        }
        if (url.includes('/bookings/admin/all')) {
          return of({
            content: [
              { id: 'bk-online', stationCode: 'PS5-01', source: 'ONLINE', payableAmount: 800, status: 'CONFIRMED', createdAt: `${todayStr}T08:00:00Z` },
              { id: 'bk-walkin', stationCode: 'PS5-02', source: 'WALK_IN', payableAmount: 500, status: 'CONFIRMED', createdAt: `${todayStr}T09:00:00Z` }
            ]
          });
        }
        return of({});
      }) as unknown as typeof apiSpy.get);

      service.getReport({ type: 'bookings', preset: '7days' }).subscribe(report => {
        expect(report.reportType).toBe('bookings');
        expect(report.kpis.find(k => k.id === 'kpi-tot-bk')?.numericValue).toBe(120);
        expect(report.breakdowns.length).toBe(2);
        done();
      });
    });
  });

  describe('getLiveBackendReport - users', () => {
    it('should synthesize users report from user stats and directory', (done) => {
      const todayStr = new Date().toISOString().split('T')[0];
      apiSpy.get.and.callFake(((url: string) => {
        if (url === '/admin/reports') return throwError(() => new Error('Not implemented'));
        if (url === '/users/admin/stats') {
          const userStats: AdminUserStatsResponse = {
            totalUsers: 50,
            activeUsers: 45,
            deactivatedUsers: 5,
            customerCount: 45,
            adminCount: 5,
            newUsersToday: 2,
            newUsersThisMonth: 12
          };
          return of(userStats);
        }
        if (url.includes('/users?size=100')) {
          return of({
            content: [
              { id: 'u1', fullName: 'Kasun P', email: 'kasun@test.lk', role: 'CUSTOMER', enabled: true, createdAt: `${todayStr}T10:00:00Z` },
              { id: 'u2', fullName: 'Admin K', email: 'admin@test.lk', role: 'ADMIN', enabled: true, createdAt: `${todayStr}T09:00:00Z` },
              { id: 'u3', fullName: 'Inactive U', email: 'inactive@test.lk', role: 'CUSTOMER', enabled: false, createdAt: `${todayStr}T08:00:00Z` }
            ]
          });
        }
        return of({});
      }) as unknown as typeof apiSpy.get);

      service.getReport({ type: 'users', preset: '30days' }).subscribe(report => {
        expect(report.reportType).toBe('users');
        expect(report.kpis.find(k => k.id === 'kpi-tot-usr')?.numericValue).toBe(50);
        expect(report.tableData.length).toBe(3);
        done();
      });
    });
  });

  describe('exportReportCsv', () => {
    it('should generate CSV blob from tableColumns and tableData', (done) => {
      const mockReport: AdminReportResponse = {
        reportType: 'revenue',
        title: 'Export Test',
        generatedAt: '2026-10-19T00:00:00Z',
        dateRange: { startDate: '2026-10-01', endDate: '2026-10-19' },
        kpis: [],
        trend: [],
        breakdowns: [],
        tableColumns: [
          { key: 'col1', label: 'Column 1' },
          { key: 'col2', label: 'Column "2"' }
        ],
        tableData: [
          { col1: 'Val 1', col2: 'Val "2"' },
          { col1: 'Val 3', col2: null }
        ]
      };

      apiSpy.get.and.returnValue(of(mockReport));

      service.exportReportCsv({ type: 'revenue', preset: 'today' }).subscribe(blob => {
        expect(blob).toBeTruthy();
        expect(blob.type).toContain('text/csv');
        done();
      });
    });
  });
});
