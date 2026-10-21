import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { MyBookingsComponent } from './my-bookings.component';
import { BookingService } from '../../core/services/booking.service';
import { MockDataService } from '../../core/services/mock/mock-data.service';
import { ToastService } from '../../shared/ui/toast/toast.service';
import { BookingResponse } from '../../shared/models/booking.model';
import { SlotAvailability } from '../../shared/models/station.model';

describe('MyBookingsComponent', () => {
  let component: MyBookingsComponent;
  let fixture: ComponentFixture<MyBookingsComponent>;
  let bookingServiceSpy: jasmine.SpyObj<BookingService>;
  let mockDataSpy: jasmine.SpyObj<MockDataService>;
  let toastServiceSpy: jasmine.SpyObj<ToastService>;

  const mockBookings: BookingResponse[] = [
    {
      id: 'bk-1',
      bookingReference: 'GC-101',
      userId: 'usr-1',
      stationId: 'st-01',
      stationName: 'PS5 Lounge #01',
      gameId: 'game-01',
      gameTitle: 'EA SPORTS FC 25',
      bookingDate: '2026-10-25',
      startTime: '18:00',
      endTime: '20:00',
      totalAmount: 1000,
      finalAmount: 1000,
      status: 'CONFIRMED',
      createdAt: '2026-10-18T10:00:00Z'
    },
    {
      id: 'bk-2',
      bookingReference: 'GC-102',
      userId: 'usr-1',
      stationId: 'st-02',
      stationName: 'PS5 Lounge #02',
      gameId: 'game-02',
      gameTitle: 'TEKKEN 8',
      bookingDate: '2026-10-28',
      startTime: '14:00',
      endTime: '16:00',
      totalAmount: 1200,
      finalAmount: 1200,
      status: 'PENDING',
      createdAt: '2026-10-18T11:00:00Z'
    },
    {
      id: 'bk-3',
      bookingReference: 'GC-103',
      userId: 'usr-1',
      stationId: 'st-01',
      stationName: 'PS5 Lounge #01',
      gameId: 'game-03',
      gameTitle: 'ELDEN RING',
      bookingDate: '2026-10-05',
      startTime: '17:00',
      endTime: '19:00',
      totalAmount: 1000,
      finalAmount: 1000,
      status: 'COMPLETED',
      createdAt: '2026-10-04T09:00:00Z'
    },
    {
      id: 'bk-4',
      bookingReference: 'GC-104',
      userId: 'usr-1',
      stationId: 'st-03',
      stationName: 'VR Rig #01',
      gameId: 'game-04',
      gameTitle: 'GRAN TURISMO 7',
      bookingDate: '2026-10-02',
      startTime: '15:00',
      endTime: '16:00',
      totalAmount: 800,
      finalAmount: 800,
      status: 'CANCELLED',
      createdAt: '2026-10-01T12:00:00Z'
    }
  ];

  const mockSlots: SlotAvailability[] = [
    {
      stationId: 'st-01',
      date: '2026-10-25',
      startTime: '10:00',
      endTime: '11:00',
      isAvailable: true,
      price: 0
    },
    {
      stationId: 'st-01',
      date: '2026-10-25',
      startTime: '11:00',
      endTime: '12:00',
      isAvailable: true,
      price: 0
    },
    {
      stationId: 'st-01',
      date: '2026-10-25',
      startTime: '12:00',
      endTime: '13:00',
      isAvailable: false,
      price: 0
    },
    {
      stationId: 'st-01',
      date: '2026-10-25',
      startTime: '13:00',
      endTime: '14:00',
      isAvailable: true,
      price: 0
    }
  ];

  beforeEach(async () => {
    bookingServiceSpy = jasmine.createSpyObj('BookingService', [
      'getMyBookings',
      'getStationAvailability',
      'rescheduleBooking'
    ]);
    mockDataSpy = jasmine.createSpyObj('MockDataService', [
      'getMyCustomerBookings',
      'rescheduleBooking'
    ]);
    toastServiceSpy = jasmine.createSpyObj('ToastService', ['success', 'error', 'info', 'warning']);

    bookingServiceSpy.getMyBookings.and.returnValue(of(mockBookings));
    bookingServiceSpy.getStationAvailability.and.returnValue(of(mockSlots));
    mockDataSpy.getMyCustomerBookings.and.returnValue(of(mockBookings));

    await TestBed.configureTestingModule({
      imports: [MyBookingsComponent],
      providers: [
        provideRouter([]),
        { provide: BookingService, useValue: bookingServiceSpy },
        { provide: MockDataService, useValue: mockDataSpy },
        { provide: ToastService, useValue: toastServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(MyBookingsComponent);
    component = fixture.componentInstance;
  });

  it('should create the component', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should fetch bookings and partition into upcoming vs played correctly', () => {
    fixture.detectChanges();
    expect(component.isLoading()).toBeFalse();
    expect(component.allBookings().length).toBe(4);

    expect(component.upcomingBookings().length).toBe(2);
    expect(component.playedBookings().length).toBe(2);

    expect(component.tabs()[0].badge).toBe(2);
    expect(component.tabs()[1].badge).toBe(2);
  });

  it('should display upcoming bookings by default sorted soonest first', () => {
    fixture.detectChanges();
    expect(component.activeTab()).toBe('upcoming');
    expect(component.currentList().length).toBe(2);
    expect(component.currentList()[0].id).toBe('bk-1');
    expect(component.currentList()[1].id).toBe('bk-2');

    const cards = fixture.nativeElement.querySelectorAll('.booking-card');
    expect(cards.length).toBe(2);
    expect(cards[0].textContent).toContain('EA SPORTS FC 25');
  });

  it('should switch to played tab and show completed & cancelled bookings', () => {
    fixture.detectChanges();
    component.onTabChange('played');
    fixture.detectChanges();

    expect(component.activeTab()).toBe('played');
    expect(component.currentList().length).toBe(2);

    expect(component.currentList()[0].id).toBe('bk-3');
    expect(component.currentList()[1].id).toBe('bk-4');

    const cards = fixture.nativeElement.querySelectorAll('.booking-card');
    expect(cards.length).toBe(2);
    expect(cards[0].textContent).toContain('ELDEN RING');
    expect(cards[1].textContent).toContain('GRAN TURISMO 7');
  });

  it('should display empty state when tab list has no bookings', () => {
    bookingServiceSpy.getMyBookings.and.returnValue(of([]));
    mockDataSpy.getMyCustomerBookings.and.returnValue(of([]));
    fixture.detectChanges();

    expect(component.currentList().length).toBe(0);
    const emptyState = fixture.nativeElement.querySelector('gc-empty-state');
    expect(emptyState).toBeTruthy();
  });

  it('should handle API errors and show retry state', () => {
    bookingServiceSpy.getMyBookings.and.returnValue(throwError(() => new Error('Server error')));
    mockDataSpy.getMyCustomerBookings.and.returnValue(throwError(() => new Error('Server error')));
    fixture.detectChanges();

    expect(component.hasError()).toBeTrue();
    expect(component.isLoading()).toBeFalse();

    bookingServiceSpy.getMyBookings.and.returnValue(of(mockBookings));
    component.loadBookings();
    fixture.detectChanges();

    expect(component.hasError()).toBeFalse();
    expect(component.allBookings().length).toBe(4);
  });

  // ── Reschedule Feature Tests ────────────────────────────────────────────────

  it('should display reschedule button only for CONFIRMED upcoming bookings given upcoming list', () => {
    // Arrange & Act
    fixture.detectChanges();
    const cards = fixture.nativeElement.querySelectorAll('.booking-card');

    // Assert: bk-1 is CONFIRMED -> has reschedule button
    const card1Button = cards[0].querySelector('.reschedule-btn-content');
    expect(card1Button).toBeTruthy();
    expect(card1Button.textContent).toContain('Reschedule');

    // bk-2 is PENDING -> does NOT have reschedule button
    const card2Button = cards[1].querySelector('.reschedule-btn-content');
    expect(card2Button).toBeNull();
  });

  it('should hide reschedule button entirely in the Played tab', () => {
    // Arrange & Act
    fixture.detectChanges();
    component.onTabChange('played');
    fixture.detectChanges();

    // Assert
    const rescheduleButtons = fixture.nativeElement.querySelectorAll('.reschedule-btn-content');
    expect(rescheduleButtons.length).toBe(0);
  });

  it('should disable reschedule button and display hint given booking starts within 2 hours', () => {
    // Arrange: Create a booking starting in 30 minutes
    const soonStart = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    const soonEnd = new Date(Date.now() + 90 * 60 * 1000).toISOString();
    const soonBooking: BookingResponse = {
      id: 'bk-soon',
      bookingReference: 'GC-SOON',
      userId: 'usr-1',
      stationId: 'st-01',
      stationName: 'PS5 Lounge #01',
      gameId: 'game-01',
      gameTitle: 'EA SPORTS FC 25',
      bookingDate: soonStart.split('T')[0],
      startTime: soonStart,
      endTime: soonEnd,
      totalAmount: 1000,
      finalAmount: 1000,
      status: 'CONFIRMED',
      createdAt: new Date().toISOString()
    };

    bookingServiceSpy.getMyBookings.and.returnValue(of([soonBooking]));

    // Act
    component.loadBookings();
    fixture.detectChanges();

    // Assert
    const item = component.upcomingBookings()[0];
    expect(item.canReschedule).toBeTrue();
    expect(item.isWithin2Hours).toBeTrue();

    const button = fixture.nativeElement.querySelector('.booking-card-actions button');
    expect(button.disabled).toBeTrue();

    const hint = fixture.nativeElement.querySelector('.reschedule-cutoff-hint');
    expect(hint).toBeTruthy();
    expect(hint.textContent).toContain('Rescheduling closes 2 hours before the start time');
  });

  it('should open reschedule modal and load station availability given reschedule button clicked', () => {
    // Arrange
    fixture.detectChanges();
    const item = component.upcomingBookings()[0];

    // Act
    component.openRescheduleModal(item);
    fixture.detectChanges();

    // Assert
    expect(component.isRescheduleModalOpen()).toBeTrue();
    expect(component.selectedBookingForReschedule()).toEqual(item);
    expect(bookingServiceSpy.getStationAvailability).toHaveBeenCalledWith(item.stationId, jasmine.any(String));
  });

  it('should select slot and enable confirm reschedule button given valid slot is selected', () => {
    // Arrange
    fixture.detectChanges();
    const item = component.upcomingBookings()[0];
    component.openRescheduleModal(item);
    fixture.detectChanges();

    // Act: Select first available slot (slots[0]: 10:00 - 11:00)
    const availableSlot = component.rescheduleSlots().find((s) => s.isAvailable);
    expect(availableSlot).toBeTruthy();

    component.selectRescheduleSlot(availableSlot!);
    fixture.detectChanges();

    // Assert
    expect(component.selectedSlotId()).toBe(availableSlot!.id);
    expect(component.canConfirmReschedule()).toBeTrue();
  });

  it('should call rescheduleBooking with correct stationId, gameId and ISO times given confirm is clicked', () => {
    // Arrange
    fixture.detectChanges();
    const item = component.upcomingBookings()[0];
    component.openRescheduleModal(item);
    fixture.detectChanges();

    const availableSlot = component.rescheduleSlots().find((s) => s.isAvailable)!;
    component.selectRescheduleSlot(availableSlot);

    const updatedBookingResponse: BookingResponse = {
      ...mockBookings[0],
      startTime: '2026-10-25T08:30:00Z',
      endTime: '2026-10-25T10:30:00Z'
    };
    bookingServiceSpy.rescheduleBooking.and.returnValue(of(updatedBookingResponse));

    // Act
    component.confirmReschedule();

    // Assert
    expect(bookingServiceSpy.rescheduleBooking).toHaveBeenCalledWith(
      item.id,
      jasmine.objectContaining({
        stationId: item.stationId,
        gameId: item.gameId,
        bookingDate: component.selectedDateStr()
      })
    );
    expect(component.isRescheduleModalOpen()).toBeFalse();
    expect(toastServiceSpy.success).toHaveBeenCalled();
  });

  it('should prevent double submission given request is already in flight', () => {
    // Arrange
    fixture.detectChanges();
    const item = component.upcomingBookings()[0];
    component.openRescheduleModal(item);
    fixture.detectChanges();

    const availableSlot = component.rescheduleSlots().find((s) => s.isAvailable)!;
    component.selectRescheduleSlot(availableSlot);

    bookingServiceSpy.rescheduleBooking.and.returnValue(of(mockBookings[0]));
    component.isSubmitting.set(true);

    // Act
    component.confirmReschedule();

    // Assert
    expect(bookingServiceSpy.rescheduleBooking).not.toHaveBeenCalled();
  });

  it('should display friendly message and refresh slots given SLOT_UNAVAILABLE error', () => {
    // Arrange
    fixture.detectChanges();
    const item = component.upcomingBookings()[0];
    component.openRescheduleModal(item);
    fixture.detectChanges();

    const availableSlot = component.rescheduleSlots().find((s) => s.isAvailable)!;
    component.selectRescheduleSlot(availableSlot);

    bookingServiceSpy.rescheduleBooking.and.returnValue(
      throwError(() => ({
        status: 409,
        code: 'SLOT_UNAVAILABLE',
        message: 'Station is already booked'
      }))
    );

    // Act
    component.confirmReschedule();
    fixture.detectChanges();

    // Assert
    expect(component.isRescheduleModalOpen()).toBeTrue();
    expect(component.rescheduleError()).toBe('That slot was just taken. Please choose another.');
    expect(component.selectedSlotId()).toBe('');
  });

  it('should explain 2-hour rule, show toast, close modal and reload given TOO_LATE error', () => {
    // Arrange
    fixture.detectChanges();
    const item = component.upcomingBookings()[0];
    component.openRescheduleModal(item);
    fixture.detectChanges();

    const availableSlot = component.rescheduleSlots().find((s) => s.isAvailable)!;
    component.selectRescheduleSlot(availableSlot);

    spyOn(component, 'loadBookings');
    bookingServiceSpy.rescheduleBooking.and.returnValue(
      throwError(() => ({
        status: 400,
        code: 'TOO_LATE',
        message: 'Too late to reschedule'
      }))
    );

    // Act
    component.confirmReschedule();
    fixture.detectChanges();

    // Assert
    expect(component.isRescheduleModalOpen()).toBeFalse();
    expect(toastServiceSpy.error).toHaveBeenCalledWith(
      'Bookings cannot be rescheduled within 2 hours of the start time.',
      'Reschedule Closed'
    );
    expect(component.loadBookings).toHaveBeenCalled();
  });

  it('should show toast, close modal and refresh list given INVALID_STATUS error', () => {
    // Arrange
    fixture.detectChanges();
    const item = component.upcomingBookings()[0];
    component.openRescheduleModal(item);
    fixture.detectChanges();

    const availableSlot = component.rescheduleSlots().find((s) => s.isAvailable)!;
    component.selectRescheduleSlot(availableSlot);

    spyOn(component, 'loadBookings');
    bookingServiceSpy.rescheduleBooking.and.returnValue(
      throwError(() => ({
        status: 409,
        code: 'INVALID_STATUS',
        message: 'Only confirmed bookings can be rescheduled'
      }))
    );

    // Act
    component.confirmReschedule();
    fixture.detectChanges();

    // Assert
    expect(component.isRescheduleModalOpen()).toBeFalse();
    expect(toastServiceSpy.error).toHaveBeenCalledWith(
      'This booking can no longer be rescheduled. Refreshing your bookings.',
      'Cannot Reschedule'
    );
    expect(component.loadBookings).toHaveBeenCalled();
  });

  it('should show specific message given STATION_INACTIVE error', () => {
    // Arrange
    fixture.detectChanges();
    const item = component.upcomingBookings()[0];
    component.openRescheduleModal(item);
    fixture.detectChanges();

    const availableSlot = component.rescheduleSlots().find((s) => s.isAvailable)!;
    component.selectRescheduleSlot(availableSlot);

    bookingServiceSpy.rescheduleBooking.and.returnValue(
      throwError(() => ({
        status: 409,
        code: 'STATION_INACTIVE',
        message: 'Station is not active'
      }))
    );

    // Act
    component.confirmReschedule();
    fixture.detectChanges();

    // Assert
    expect(component.isRescheduleModalOpen()).toBeTrue();
    expect(component.rescheduleError()).toBe('This game or station is no longer available for rescheduling');
  });

  it('should show generic message given unknown or network error', () => {
    // Arrange
    fixture.detectChanges();
    const item = component.upcomingBookings()[0];
    component.openRescheduleModal(item);
    fixture.detectChanges();

    const availableSlot = component.rescheduleSlots().find((s) => s.isAvailable)!;
    component.selectRescheduleSlot(availableSlot);

    bookingServiceSpy.rescheduleBooking.and.returnValue(
      throwError(() => ({
        status: 0,
        code: 'UNKNOWN_ERROR',
        message: 'Connection failed'
      }))
    );

    // Act
    component.confirmReschedule();
    fixture.detectChanges();

    // Assert
    expect(component.isRescheduleModalOpen()).toBeTrue();
    expect(component.rescheduleError()).toContain('Connection failed');
  });
});

