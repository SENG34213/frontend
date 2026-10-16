import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { provideRouter, ActivatedRoute } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';
import { AdminBookingsComponent } from './admin-bookings.component';
import { BookingAdminService, PagedAdminBookings } from './booking-admin.service';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { AdminBookingRow } from '../../../shared/models';

const mockRows: AdminBookingRow[] = [
  {
    id: 'bk-001',
    userId: 'usr-001',
    stationId: 'st-01',
    stationCode: 'PS5-01',
    stationType: 'PS5',
    hourlyRate: 650,
    startTime: '2026-10-15T11:00:00Z',
    endTime: '2026-10-15T13:00:00Z',
    durationMinutes: 120,
    status: 'CONFIRMED',
    source: 'ONLINE',
    totalAmount: 1300,
    payableAmount: 1300,
    createdAt: '2026-10-15T09:00:00Z'
  },
  {
    id: 'bk-002',
    userId: 'usr-002',
    stationId: 'st-04',
    stationCode: 'PC-04',
    stationType: 'PC_ESPORTS',
    hourlyRate: 800,
    startTime: '2026-10-15T14:00:00Z',
    endTime: '2026-10-15T16:00:00Z',
    durationMinutes: 120,
    status: 'IN_PROGRESS',
    source: 'WALK_IN',
    totalAmount: 1600,
    payableAmount: 1600,
    createdAt: '2026-10-15T13:50:00Z'
  },
  {
    id: 'bk-003',
    userId: 'usr-003',
    stationId: 'st-02',
    stationCode: 'PS5-02',
    stationType: 'PS5',
    hourlyRate: 650,
    startTime: '2026-10-15T17:00:00Z',
    endTime: '2026-10-15T18:00:00Z',
    durationMinutes: 60,
    status: 'PENDING',
    source: 'WALK_IN',
    totalAmount: 650,
    payableAmount: 650,
    createdAt: '2026-10-15T16:50:00Z'
  }
];

const mockPaged: PagedAdminBookings = {
  content: mockRows,
  totalElements: 3,
  totalPages: 1,
  number: 0,
  size: 20
};

describe('AdminBookingsComponent', () => {
  let component: AdminBookingsComponent;
  let fixture: ComponentFixture<AdminBookingsComponent>;
  let svcSpy: jasmine.SpyObj<BookingAdminService>;
  let toastSpy: jasmine.SpyObj<ToastService>;

  beforeEach(async () => {
    svcSpy = jasmine.createSpyObj('BookingAdminService', [
      'getBookings', 'cancelBooking', 'rescheduleBooking', 'createWalkIn', 'exportCsv'
    ]);
    toastSpy = jasmine.createSpyObj('ToastService', ['success', 'error', 'info', 'warning', 'show']);

    svcSpy.getBookings.and.returnValue(of(mockPaged));
    svcSpy.cancelBooking.and.returnValue(of({ ...mockRows[0], status: 'CANCELLED' as const }));
    svcSpy.rescheduleBooking.and.returnValue(of(mockRows[0]));
    svcSpy.createWalkIn.and.returnValue(of({ ...mockRows[0], source: 'WALK_IN' as const, status: 'PENDING' as const }));
    svcSpy.exportCsv.and.returnValue('/api/bookings/admin/export.csv');

    await TestBed.configureTestingModule({
      imports: [AdminBookingsComponent, ReactiveFormsModule],
      providers: [
        provideRouter([]),
        { provide: BookingAdminService, useValue: svcSpy },
        { provide: ToastService, useValue: toastSpy },
        {
          provide: ActivatedRoute,
          useValue: { queryParams: of({}) }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AdminBookingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and load bookings on init', () => {
    expect(component).toBeTruthy();
    expect(component.isLoading()).toBeFalse();
    expect(component.rows().length).toBe(3);
    expect(component.totalElements()).toBe(3);
  });

  it('should render all booking rows in the table', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const rows = compiled.querySelectorAll('.booking-row');
    expect(rows.length).toBe(3);
  });

  it('TC-FE-BKM-01: should display error banner when API fails', () => {
    svcSpy.getBookings.and.returnValue(throwError(() => new Error('Server error')));
    component.loadBookings();
    fixture.detectChanges();

    expect(component.errorMessage()).toContain('Unable to load bookings');
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.error-banner')).toBeTruthy();
  });

  it('TC-FE-BKM-02: should correctly identify which bookings can be cancelled or rescheduled', () => {
    // CONFIRMED → can cancel AND reschedule
    const confirmed = mockRows[0];
    expect(component.canCancel(confirmed)).toBeTrue();
    expect(component.canReschedule(confirmed)).toBeTrue();

    // IN_PROGRESS → cannot cancel or reschedule
    const inProgress = mockRows[1];
    expect(component.canCancel(inProgress)).toBeFalse();
    expect(component.canReschedule(inProgress)).toBeFalse();

    // PENDING → can cancel, cannot reschedule
    const pending = mockRows[2];
    expect(component.canCancel(pending)).toBeTrue();
    expect(component.canReschedule(pending)).toBeFalse();
  });

  it('TC-FE-BKM-03: should open detail panel when row is clicked', () => {
    component.openDetail(mockRows[0]);
    expect(component.detailPanelOpen()).toBeTrue();
    expect(component.selectedBooking()?.id).toBe('bk-001');
  });

  it('TC-FE-BKM-04: should close detail panel', () => {
    component.openDetail(mockRows[0]);
    component.closeDetail();
    expect(component.detailPanelOpen()).toBeFalse();
  });

  it('TC-FE-BKM-05: should open walk-in modal and reset form', () => {
    component.openWalkIn();
    expect(component.walkInModalOpen()).toBeTrue();
    expect(component.walkInForm.get('targetUserId')?.value).toBe('');
  });

  it('TC-FE-BKM-06: should not submit walk-in form when invalid', () => {
    component.walkInForm.patchValue({ targetUserId: '', stationId: '', startTime: '', endTime: '' });
    component.submitWalkIn();
    expect(svcSpy.createWalkIn).not.toHaveBeenCalled();
    expect(component.walkInForm.touched).toBeTrue();
  });

  it('TC-FE-BKM-07: should submit walk-in and reload after success', () => {
    component.openWalkIn();
    component.walkInForm.patchValue({
      targetUserId: '123e4567-e89b-12d3-a456-426614174000',
      stationId: '223e4567-e89b-12d3-a456-426614174000',
      startTime: '2026-10-20T14:00',
      endTime: '2026-10-20T16:00'
    });

    component.submitWalkIn();

    expect(svcSpy.createWalkIn).toHaveBeenCalled();
    expect(toastSpy.success).toHaveBeenCalled();
    expect(component.walkInModalOpen()).toBeFalse();
  });

  it('TC-FE-BKM-08: should open cancel confirm modal and not yet cancel', () => {
    const event = new MouseEvent('click');
    component.openCancel(mockRows[0], event);
    expect(component.cancelModalOpen()).toBeTrue();
    expect(component.actionTarget()?.id).toBe('bk-001');
    expect(svcSpy.cancelBooking).not.toHaveBeenCalled();
  });

  it('TC-FE-BKM-09: should confirm cancel, reload, and show toast', () => {
    const event = new MouseEvent('click');
    component.openCancel(mockRows[0], event);
    component.confirmCancel();

    expect(svcSpy.cancelBooking).toHaveBeenCalledWith('bk-001');
    expect(toastSpy.success).toHaveBeenCalled();
    expect(component.cancelModalOpen()).toBeFalse();
  });

  it('TC-FE-BKM-10: should show error toast when cancel API fails', () => {
    svcSpy.cancelBooking.and.returnValue(throwError(() => ({
      error: { message: 'Booking already in progress' }
    })));

    const event = new MouseEvent('click');
    component.openCancel(mockRows[0], event);
    component.confirmCancel();

    expect(toastSpy.error).toHaveBeenCalledWith('Booking already in progress');
  });

  it('TC-FE-BKM-11: should apply status badge variants correctly', () => {
    expect(component.getStatusVariant('IN_PROGRESS')).toBe('available');
    expect(component.getStatusVariant('CONFIRMED')).toBe('primary');
    expect(component.getStatusVariant('PENDING')).toBe('warning');
    expect(component.getStatusVariant('COMPLETED')).toBe('neutral');
    expect(component.getStatusVariant('CANCELLED')).toBe('occupied');
  });

  it('TC-FE-BKM-12: should open CSV export in new window', () => {
    spyOn(window, 'open');
    component.exportCsv();
    expect(window.open).toHaveBeenCalledWith('/api/bookings/admin/export.csv', '_blank');
  });

  it('TC-FE-BKM-13: should paginate — changing page triggers loadBookings', () => {
    svcSpy.getBookings.calls.reset();
    component.onPageChange(1);
    expect(component.currentPage()).toBe(1);
    expect(svcSpy.getBookings).toHaveBeenCalled();
  });

  it('TC-FE-BKM-14: should apply status filter and reset page to 0', () => {
    component.onStatusChange('CONFIRMED');
    expect(component.filterStatus()).toBe('CONFIRMED');
    expect(component.currentPage()).toBe(0);
    expect(svcSpy.getBookings).toHaveBeenCalled();
  });

  it('TC-FE-BKM-15: should clear all filters', () => {
    component.filterStatus.set('CONFIRMED');
    component.filterSource.set('WALK_IN');
    component.clearFilters();
    expect(component.filterStatus()).toBe('');
    expect(component.filterSource()).toBe('');
    expect(component.currentPage()).toBe(0);
  });
});
