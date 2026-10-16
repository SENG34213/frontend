import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { BookingsComponent } from './bookings.component';
import { BookingService } from '../../core/services/booking.service';
import { of } from 'rxjs';
import { Station, Game, SlotAvailability } from '../../shared/models';

describe('BookingsComponent', () => {
  let component: BookingsComponent;
  let fixture: ComponentFixture<BookingsComponent>;
  let mockBookingService: jasmine.SpyObj<BookingService>;

  const testStations: Station[] = [
    {
      id: 'st-01',
      stationNumber: 1,
      stationCode: 'PS5-01',
      name: 'PS5 CONSOLE 01',
      type: 'PS5',
      hourlyRate: 500,
      specifications: 'Ultra-High Speed SSD',
      controllersCount: 4,
      imageUrl: '/assets/images/ps5_console_01.jpg',
      active: true
    },
    {
      id: 'st-02',
      stationNumber: 2,
      stationCode: 'PS5-02',
      name: 'PS5 CONSOLE 02',
      type: 'PS5',
      hourlyRate: 500,
      specifications: '4K-TV Gaming',
      controllersCount: 4,
      imageUrl: '/assets/images/ps5_console_02.jpg',
      active: true
    }
  ];

  const testGames: Game[] = [
    { id: 'game-01', title: 'CYBERPUNK 2077', coverImage: '/assets/images/game_cyberpunk.jpg' },
    { id: 'game-02', title: 'GRAN TURISMO 7', coverImage: '/assets/images/game_granturismo.jpg' },
    { id: 'game-03', title: 'ELDEN RING', coverImage: '/assets/images/game_eldenring.jpg' },
    { id: 'game-04', title: 'TEKKEN 8', coverImage: '/assets/images/game_tekken.jpg' }
  ];

  const testSlots: SlotAvailability[] = [
    { stationId: 'st-01', date: '2024-11-04', startTime: '10:00', endTime: '11:00', isAvailable: true, price: 500 },
    { stationId: 'st-01', date: '2024-11-04', startTime: '11:00', endTime: '12:00', isAvailable: true, price: 500 },
    { stationId: 'st-01', date: '2024-11-04', startTime: '12:00', endTime: '13:00', isAvailable: true, price: 500 },
    { stationId: 'st-01', date: '2024-11-04', startTime: '13:00', endTime: '14:00', isAvailable: false, price: 500 }
  ];

  beforeEach(async () => {
    mockBookingService = jasmine.createSpyObj<BookingService>('BookingService', [
      'getStations',
      'getGames',
      'getStationAvailability',
      'getLoyaltyBalance',
      'createBooking'
    ]);

    mockBookingService.getStations.and.returnValue(of(testStations));
    mockBookingService.getGames.and.returnValue(of(testGames));
    mockBookingService.getStationAvailability.and.returnValue(of(testSlots));
    mockBookingService.getLoyaltyBalance.and.returnValue(of({
      userId: 'usr-1',
      pointsBalance: 1250,
      tier: 'GOLD',
      equivalentDiscountLkr: 1250
    }));
    mockBookingService.createBooking.and.returnValue(of({
      id: 'bk-12345',
      bookingReference: 'GC-999888',
      userId: 'usr-1',
      stationId: 'st-01',
      stationName: 'PS5 CONSOLE 01',
      bookingDate: '2024-11-04',
      startTime: '12:00 PM',
      endTime: '01:00 PM',
      totalAmount: 1000,
      discountAmount: 300,
      finalAmount: 700,
      status: 'CONFIRMED',
      createdAt: new Date().toISOString()
    }));

    await TestBed.configureTestingModule({
      imports: [BookingsComponent],
      providers: [
        provideHttpClient(),
        provideRouter([]),
        { provide: BookingService, useValue: mockBookingService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(BookingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create BookingsComponent successfully', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with current month selected by default', () => {
    const now = new Date();
    const monthNames = [
      'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
      'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'
    ];
    const expectedTitle = `${monthNames[now.getMonth()]} ${now.getFullYear()}`;
    const padMonth = String(now.getMonth() + 1).padStart(2, '0');
    const padDay = String(now.getDate()).padStart(2, '0');
    const expectedDateStr = `${now.getFullYear()}-${padMonth}-${padDay}`;

    expect(component.currentMonthTitle()).toBe(expectedTitle);
    expect(component.selectedDateStr()).toBe(expectedDateStr);
  });

  it('should navigate months forward and backward', () => {
    const startMonth = component.currentMonthTitle();
    component.nextMonth();
    expect(component.currentMonthTitle()).not.toBe(startMonth);
    component.prevMonth();
    expect(component.currentMonthTitle()).toBe(startMonth);
  });

  it('should only show active game stations', () => {
    const active = component.activeStations();
    expect(active.length).toBeGreaterThan(0);
    expect(active.every((s) => s.active)).toBeTrue();
  });

  it('should correctly select a date from the calendar', () => {
    const candidateDay = component.calendarDays().find((d) => d.isCurrentMonth && !d.isPast);
    if (candidateDay) {
      component.selectDate(candidateDay);
      expect(component.selectedDateStr()).toBe(candidateDay.dateStr);
      expect(mockBookingService.getStationAvailability).toHaveBeenCalledWith('st-01', candidateDay.dateStr);
    }
  });

  it('should switch selected console and update rates', () => {
    component.selectStation('st-02');
    expect(component.selectedStationId()).toBe('st-02');
    expect(component.selectedStation()?.name).toBe('PS5 CONSOLE 02');
  });

  it('should switch selected game', () => {
    component.selectGame('game-02');
    expect(component.selectedGameId()).toBe('game-02');
    expect(component.selectedGame()?.title).toBe('GRAN TURISMO 7');
  });

  it('should calculate base rate, subtotal, and loyalty discount correctly for 1 hour', () => {
    // 1 hour at 500/hr = 500
    expect(component.baseHourlyRate()).toBe(500);
    expect(component.sessionHours()).toBe(1);
    expect(component.subtotalAmount()).toBe(500);

    // Initial total amount for 1 hour without loyalty discount
    expect(component.redeemLoyalty()).toBeFalse();
    expect(component.totalAmount()).toBe(500);

    // Toggle loyalty on
    component.toggleLoyalty();
    expect(component.redeemLoyalty()).toBeTrue();
    // 50% max discount on 500 subtotal is 250 LKR (500 points)
    expect(component.effectivePointsToRedeem()).toBe(500);
    expect(component.loyaltyDiscountAmount()).toBe(250);
    expect(component.totalAmount()).toBe(250);
  });

  it('should open checkout modal and confirm booking payment', () => {
    expect(component.paymentModalOpen()).toBeFalse();
    component.onProceedToPayment();
    expect(component.paymentModalOpen()).toBeTrue();

    component.confirmPayment();
    expect(mockBookingService.createBooking).toHaveBeenCalled();
    expect(component.bookingSuccessReceipt()).toBeTruthy();
    expect(component.bookingSuccessReceipt()?.bookingReference).toBe('GC-999888');
  });

  it('should disable loyalty redemption when points balance is below 100', () => {
    component.loyaltyPointsBalance.set(16);
    expect(component.canRedeemLoyalty()).toBeFalse();

    component.toggleLoyalty();
    expect(component.redeemLoyalty()).toBeFalse();
    expect(component.effectivePointsToRedeem()).toBe(0);
    expect(component.loyaltyDiscountAmount()).toBe(0);

    // confirmPayment should send 0 pointsToRedeem
    component.confirmPayment();
    expect(mockBookingService.createBooking).toHaveBeenCalledWith(
      jasmine.objectContaining({
        pointsToRedeem: 0
      })
    );
  });

  it('should deactivate past dates in the calendar and prevent selection', () => {
    const days = component.calendarDays();
    const pastDay = days.find((d) => d.isPast);
    expect(pastDay).toBeDefined();
    expect(pastDay?.isPast).toBeTrue();

    const initialDate = component.selectedDateStr();
    // Attempt to select a past date
    component.selectDate(pastDay!);
    // selectedDateStr should NOT change
    expect(component.selectedDateStr()).toBe(initialDate);
  });

  it('should deactivate booked slots and prevent selection', () => {
    const slots = component.availableSlots();
    const bookedSlot = slots.find((s) => !s.isAvailable);
    expect(bookedSlot).toBeDefined();

    const previousSelectedSlotId = component.selectedSlotId();
    // Attempt to select the booked slot
    component.selectSlot(bookedSlot!);
    // Selected slot ID should not change to the booked slot
    expect(component.selectedSlotId()).toBe(previousSelectedSlotId);
  });

  it('should enforce CARD payment method only and submit booking with CARD', () => {
    expect(component.paymentMethod()).toBe('CARD');
    component.confirmPayment();
    expect(mockBookingService.createBooking).toHaveBeenCalledWith(
      jasmine.objectContaining({
        paymentMethod: 'CARD'
      })
    );
  });
});
