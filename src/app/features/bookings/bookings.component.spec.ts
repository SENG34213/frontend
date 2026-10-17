import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { of, throwError } from 'rxjs';
import { BookingsComponent } from './bookings.component';
import { BookingService } from '../../core/services/booking.service';
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

  const testGamesStation1: Game[] = [
    { id: 'game-01', title: 'GRAN TURISMO 7', coverImage: '/assets/images/game_granturismo.jpg', platforms: ['PS5'], active: true },
    { id: 'game-02', title: 'TEKKEN 8', coverImage: '/assets/images/game_tekken.jpg', platforms: ['PS5'], active: true }
  ];

  const testGamesStation2: Game[] = [
    { id: 'game-03', title: 'ELDEN RING', coverImage: '/assets/images/game_eldenring.jpg', platforms: ['PS5'], active: true }
  ];

  const testSlots: SlotAvailability[] = [
    { stationId: 'st-01', date: '2026-11-04', startTime: '10:00', endTime: '11:00', isAvailable: true, price: 500 },
    { stationId: 'st-01', date: '2026-11-04', startTime: '11:00', endTime: '12:00', isAvailable: true, price: 500 },
    { stationId: 'st-01', date: '2026-11-04', startTime: '12:00', endTime: '13:00', isAvailable: true, price: 500 },
    { stationId: 'st-01', date: '2026-11-04', startTime: '13:00', endTime: '14:00', isAvailable: false, price: 500 }
  ];

  beforeEach(async () => {
    mockBookingService = jasmine.createSpyObj<BookingService>('BookingService', [
      'getStations',
      'getStationGames',
      'getGames',
      'getGameStations',
      'getStationAvailability',
      'getLoyaltyBalance',
      'createBooking'
    ]);

    mockBookingService.getStations.and.returnValue(of(testStations));
    mockBookingService.getStationGames.and.callFake((id: string) => {
      return of(id === 'st-01' ? testGamesStation1 : testGamesStation2);
    });
    mockBookingService.getGames.and.returnValue(of(testGamesStation1));
    mockBookingService.getGameStations.and.returnValue(of(testStations));
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
      gameId: 'game-01',
      gameTitle: 'GRAN TURISMO 7',
      bookingDate: '2026-11-04',
      startTime: '10:00 AM',
      endTime: '11:00 AM',
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
        { provide: BookingService, useValue: mockBookingService },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParams: {} } }
        }
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
    expect(component.currentMonthTitle()).toBe(expectedTitle);
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
    }
  });

  it('should load station-specific games when switching station', () => {
    component.selectStation('st-02');
    expect(component.selectedStationId()).toBe('st-02');
    expect(component.selectedStation()?.name).toBe('PS5 CONSOLE 02');
    expect(mockBookingService.getStationGames).toHaveBeenCalledWith('st-02');
  });

  it('should reset game selection when switching station', () => {
    component.selectGame('game-01');
    expect(component.selectedGameId()).toBe('game-01');

    component.selectStation('st-02');
    expect(component.selectedGameId()).toBe('');
  });

  it('should select a game', () => {
    component.stationGames.set(testGamesStation1);
    component.selectGame('game-02');
    expect(component.selectedGameId()).toBe('game-02');
    expect(component.selectedGame()?.title).toBe('TEKKEN 8');
  });

  it('should require game before payment (canProceedToPayment returns false)', () => {
    // Station set, game NOT set, slot set
    component.selectedStationId.set('st-01');
    component.stationGames.set(testGamesStation1);
    component.selectedGameId.set('');
    const firstAvail = component.availableSlots().find((s) => s.isAvailable);
    if (firstAvail) component.selectedSlotId.set(firstAvail.id);

    expect(component.canProceedToPayment()).toBeFalse();
  });

  it('should enable payment button only when station + game + slot are all selected', () => {
    component.selectedStationId.set('st-01');
    component.stationGames.set(testGamesStation1);
    component.selectedGameId.set('game-01');
    const firstAvail = component.availableSlots().find((s) => s.isAvailable);
    if (firstAvail) component.selectedSlotId.set(firstAvail.id);

    expect(component.canProceedToPayment()).toBeTrue();
  });

  it('should send gameId in the booking payload', () => {
    component.selectedStationId.set('st-01');
    component.stationGames.set(testGamesStation1);
    component.selectedGameId.set('game-01');
    const firstAvail = component.availableSlots().find((s) => s.isAvailable);
    if (firstAvail) component.selectedSlotId.set(firstAvail.id);

    component.confirmPayment();

    expect(mockBookingService.createBooking).toHaveBeenCalledWith(
      jasmine.objectContaining({
        stationId: 'st-01',
        gameId: 'game-01',
        paymentMethod: 'CARD'
      })
    );
  });

  it('should show success receipt with game title after booking', () => {
    component.selectedStationId.set('st-01');
    component.stationGames.set(testGamesStation1);
    component.selectedGameId.set('game-01');
    const firstAvail = component.availableSlots().find((s) => s.isAvailable);
    if (firstAvail) component.selectedSlotId.set(firstAvail.id);

    component.confirmPayment();

    expect(component.bookingSuccessReceipt()).toBeTruthy();
    expect(component.bookingSuccessReceipt()?.bookingReference).toBe('GC-999888');
    expect(component.bookingSuccessReceipt()?.gameTitle).toBe('GRAN TURISMO 7');
  });

  it('should calculate base rate, subtotal, and loyalty discount correctly for 1 hour', () => {
    expect(component.baseHourlyRate()).toBe(500);
    expect(component.sessionHours()).toBe(1);
    expect(component.subtotalAmount()).toBe(500);
    expect(component.redeemLoyalty()).toBeFalse();
    expect(component.totalAmount()).toBe(500);

    component.toggleLoyalty();
    expect(component.redeemLoyalty()).toBeTrue();
    expect(component.effectivePointsToRedeem()).toBe(500);
    expect(component.loyaltyDiscountAmount()).toBe(250);
    expect(component.totalAmount()).toBe(250);
  });

  it('should deactivate past dates in the calendar and prevent selection', () => {
    const days = component.calendarDays();
    const pastDay = days.find((d) => d.isPast);
    expect(pastDay).toBeDefined();
    const initialDate = component.selectedDateStr();
    component.selectDate(pastDay!);
    expect(component.selectedDateStr()).toBe(initialDate);
  });

  it('should deactivate booked slots and prevent selection', () => {
    const bookedSlot = component.availableSlots().find((s) => !s.isAvailable);
    expect(bookedSlot).toBeDefined();
    const previousSelectedSlotId = component.selectedSlotId();
    component.selectSlot(bookedSlot!);
    expect(component.selectedSlotId()).toBe(previousSelectedSlotId);
  });

  it('should enforce CARD payment method only', () => {
    expect(component.paymentMethod()).toBe('CARD');
    component.selectedStationId.set('st-01');
    component.stationGames.set(testGamesStation1);
    component.selectedGameId.set('game-01');
    const firstAvail = component.availableSlots().find((s) => s.isAvailable);
    if (firstAvail) component.selectedSlotId.set(firstAvail.id);

    component.confirmPayment();
    expect(mockBookingService.createBooking).toHaveBeenCalledWith(
      jasmine.objectContaining({ paymentMethod: 'CARD' })
    );
  });

  it('should disable loyalty redemption when points balance is below 100', () => {
    component.loyaltyPointsBalance.set(16);
    expect(component.canRedeemLoyalty()).toBeFalse();
    component.toggleLoyalty();
    expect(component.redeemLoyalty()).toBeFalse();
    expect(component.effectivePointsToRedeem()).toBe(0);
    expect(component.loyaltyDiscountAmount()).toBe(0);
  });

  describe('Query Parameters Handling', () => {
    it('should read stationId and gameId from query params and preselect both given they exist', () => {
      // Arrange
      const route = TestBed.inject(ActivatedRoute);
      (route as any).snapshot = {
        queryParams: { stationId: 'st-02', gameId: 'game-03' }
      };

      // Act
      component.ngOnInit();

      // Assert
      expect(component.selectedStationId()).toBe('st-02');
      expect(mockBookingService.getStationGames).toHaveBeenCalledWith('st-02');
      expect(component.selectedGameId()).toBe('game-03');
    });

    it('should read gameId from query params and find station via getGameStations given only gameId is present', () => {
      // Arrange
      const route = TestBed.inject(ActivatedRoute);
      (route as any).snapshot = {
        queryParams: { gameId: 'game-01' }
      };

      // Act
      component.ngOnInit();

      // Assert
      expect(mockBookingService.getGameStations).toHaveBeenCalledWith('game-01');
      expect(component.selectedStationId()).toBe('st-01');
      expect(component.selectedGameId()).toBe('game-01');
    });
  });

  describe('canProceedToPayment Validation', () => {
    it('should evaluate canProceedToPayment as false given station is missing', () => {
      // Arrange: no station
      component.selectedStationId.set('');
      component.selectedGameId.set('game-01');
      const firstAvail = component.availableSlots().find((s) => s.isAvailable);
      if (firstAvail) component.selectedSlotId.set(firstAvail.id);

      // Assert
      expect(component.canProceedToPayment()).toBeFalse();
    });

    it('should evaluate canProceedToPayment as false given game is missing', () => {
      // Arrange: station and slot, but no game
      component.selectedStationId.set('st-01');
      component.selectedGameId.set('');
      const firstAvail = component.availableSlots().find((s) => s.isAvailable);
      if (firstAvail) component.selectedSlotId.set(firstAvail.id);

      // Assert
      expect(component.canProceedToPayment()).toBeFalse();
    });

    it('should evaluate canProceedToPayment as false given slot is missing', () => {
      // Arrange: station and game, but no slot
      component.selectedStationId.set('st-01');
      component.stationGames.set(testGamesStation1);
      component.selectedGameId.set('game-01');
      component.selectedSlotId.set('');

      // Assert
      expect(component.canProceedToPayment()).toBeFalse();
    });

    it('should evaluate canProceedToPayment as true given station, game, and slot are all selected', () => {
      // Arrange
      component.selectedStationId.set('st-01');
      component.stationGames.set(testGamesStation1);
      component.selectedGameId.set('game-01');
      const firstAvail = component.availableSlots().find((s) => s.isAvailable);
      if (firstAvail) component.selectedSlotId.set(firstAvail.id);

      // Assert
      expect(component.canProceedToPayment()).toBeTrue();
    });
  });

  describe('Error Handling for Game Booking', () => {
    beforeEach(() => {
      component.selectedStationId.set('st-01');
      component.stationGames.set(testGamesStation1);
      component.selectedGameId.set('game-01');
      const firstAvail = component.availableSlots().find((s) => s.isAvailable);
      if (firstAvail) component.selectedSlotId.set(firstAvail.id);
    });

    it('should display friendly message and clear game selection given GAME_NOT_ON_STATION error', () => {
      // Arrange
      mockBookingService.createBooking.and.returnValue(
        throwError(() => ({ error: { error: 'GAME_NOT_ON_STATION' } }))
      );

      // Act
      component.confirmPayment();

      // Assert
      expect(component.bookingErrorMessage()).toBe(
        'This game is not installed on the selected station. Please choose a different game.'
      );
      expect(component.selectedGameId()).toBe('');
      expect(mockBookingService.getStationGames).toHaveBeenCalledWith('st-01');
    });

    it('should display friendly message given GAME_INACTIVE error', () => {
      // Arrange
      mockBookingService.createBooking.and.returnValue(
        throwError(() => ({ error: { error: 'GAME_INACTIVE' } }))
      );

      // Act
      component.confirmPayment();

      // Assert
      expect(component.bookingErrorMessage()).toBe(
        'This game is no longer available. Please choose another game.'
      );
      expect(mockBookingService.getStationGames).toHaveBeenCalledWith('st-01');
    });

    it('should display friendly message given GAME_NOT_FOUND error', () => {
      // Arrange
      mockBookingService.createBooking.and.returnValue(
        throwError(() => ({ error: { error: 'GAME_NOT_FOUND' } }))
      );

      // Act
      component.confirmPayment();

      // Assert
      expect(component.bookingErrorMessage()).toBe(
        'The selected game could not be found. Please choose another game.'
      );
      expect(mockBookingService.getStationGames).toHaveBeenCalledWith('st-01');
    });
  });
});
