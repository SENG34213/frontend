import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { BookingAdminService, BookingFilter } from './booking-admin.service';
import { ApiService } from '../../../core/services/api.service';
import { AdminBookingRow } from '../../../shared/models';

describe('BookingAdminService', () => {
  let service: BookingAdminService;
  let apiSpy: jasmine.SpyObj<ApiService>;

  const mockBookingRow: AdminBookingRow = {
    id: 'bk-123',
    userId: 'usr-1',
    stationId: 'st-1',
    stationCode: 'PS5-01',
    startTime: '2026-10-19T10:00:00Z',
    endTime: '2026-10-19T12:00:00Z',
    status: 'CONFIRMED',
    source: 'ONLINE',
    payableAmount: 1000,
    createdAt: '2026-10-19T10:00:00Z'
  };

  beforeEach(() => {
    apiSpy = jasmine.createSpyObj('ApiService', ['get', 'post', 'patch']);
    TestBed.configureTestingModule({
      providers: [
        BookingAdminService,
        { provide: ApiService, useValue: apiSpy }
      ]
    });
    service = TestBed.inject(BookingAdminService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should get bookings with query params', (done) => {
    const filter: BookingFilter = {
      page: 0,
      size: 10,
      sort: 'createdAt,desc',
      status: 'CONFIRMED',
      source: 'ONLINE',
      userId: 'usr-1',
      stationId: 'st-1',
      from: '2026-10-01',
      to: '2026-10-19'
    };

    apiSpy.get.and.returnValue(of({
      content: [mockBookingRow],
      totalElements: 1,
      totalPages: 1,
      number: 0,
      size: 10
    }));

    service.getBookings(filter).subscribe(res => {
      expect(res.content.length).toBe(1);
      expect(apiSpy.get).toHaveBeenCalledWith('/bookings/admin/all', jasmine.any(Object));
      done();
    });
  });

  it('should cancel a booking via PATCH', (done) => {
    apiSpy.patch.and.returnValue(of({ ...mockBookingRow, status: 'CANCELLED' }));

    service.cancelBooking('bk-123').subscribe(res => {
      expect(res.status).toBe('CANCELLED');
      expect(apiSpy.patch).toHaveBeenCalledWith('/bookings/bk-123/cancel', {});
      done();
    });
  });

  it('should reschedule a booking via PATCH', (done) => {
    const rescheduleReq = {
      stationId: 'st-2',
      startTime: '2026-10-20T10:00:00Z',
      endTime: '2026-10-20T12:00:00Z'
    };

    apiSpy.patch.and.returnValue(of({ ...mockBookingRow, stationId: 'st-2' }));

    service.rescheduleBooking('bk-123', rescheduleReq).subscribe(res => {
      expect(res.stationId).toBe('st-2');
      expect(apiSpy.patch).toHaveBeenCalledWith('/bookings/bk-123/reschedule', rescheduleReq);
      done();
    });
  });

  it('should confirm a booking with paymentId via PATCH', (done) => {
    apiSpy.patch.and.returnValue(of({ ...mockBookingRow, paymentId: 'pay-1' }));

    service.confirmBooking('bk-123', 'pay-1').subscribe(res => {
      expect(res.paymentId).toBe('pay-1');
      expect(apiSpy.patch).toHaveBeenCalledWith('/bookings/bk-123/confirm', { paymentId: 'pay-1' });
      done();
    });
  });

  it('should create walk-in booking via POST', (done) => {
    const walkInReq = {
      targetUserId: 'usr-guest',
      stationId: 'st-1',
      gameId: 'game-1',
      startTime: '2026-10-19T10:00:00Z',
      endTime: '2026-10-19T11:00:00Z'
    };

    apiSpy.post.and.returnValue(of({ ...mockBookingRow, source: 'WALK_IN' }));

    service.createWalkIn(walkInReq).subscribe(res => {
      expect(res.source).toBe('WALK_IN');
      expect(apiSpy.post).toHaveBeenCalledWith('/bookings/walk-in', walkInReq);
      done();
    });
  });

  it('should process payment and confirm booking in sequence via finishBookingPayment', (done) => {
    apiSpy.post.and.returnValue(of({ id: 'pay-cash-999' }));
    apiSpy.patch.and.returnValue(of({ ...mockBookingRow, status: 'CONFIRMED', paymentId: 'pay-cash-999' }));

    service.finishBookingPayment('bk-123', 'usr-guest', 1500).subscribe(res => {
      expect(res.status).toBe('CONFIRMED');
      expect(res.paymentId).toBe('pay-cash-999');
      expect(apiSpy.post).toHaveBeenCalledWith('/payments/cash', jasmine.objectContaining({
        referenceType: 'BOOKING',
        referenceId: 'bk-123',
        amount: 1500,
        customerUserId: 'usr-guest'
      }));
      expect(apiSpy.patch).toHaveBeenCalledWith('/bookings/bk-123/confirm', { paymentId: 'pay-cash-999' });
      done();
    });
  });

  it('should construct export CSV URL with and without query parameters', () => {
    const urlWithParams = service.exportCsv({
      status: 'CONFIRMED',
      source: 'ONLINE',
      from: '2026-10-01',
      to: '2026-10-19'
    });
    expect(urlWithParams).toContain('/bookings/admin/export.csv?');
    expect(urlWithParams).toContain('status=CONFIRMED');
    expect(urlWithParams).toContain('source=ONLINE');

    const urlNoParams = service.exportCsv({});
    expect(urlNoParams).toMatch(/\/bookings\/admin\/export\.csv$/);
  });
});
