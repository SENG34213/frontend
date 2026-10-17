import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { BookingService } from '../../core/services/booking.service';
import { AuthService } from '../../core/services/auth.service';
import { Station, Game, BookingResponse } from '../../shared/models';
import { ButtonComponent } from '../../shared/ui/button/button.component';
import { ModalComponent } from '../../shared/ui/modal/modal.component';

export interface CalendarDay {
  dayNumber: number;
  dateStr: string; // YYYY-MM-DD
  isCurrentMonth: boolean;
  isSelected: boolean;
  isToday: boolean;
  isPast: boolean;
  isWeekend: boolean;
}

export interface DisplaySlot {
  id: string;
  startTime: string; // e.g. "12:00 PM"
  endTime: string;   // e.g. "01:00 PM"
  rawStart: string;  // e.g. "12:00"
  rawEnd: string;    // e.g. "13:00"
  durationHours: number;
  isAvailable: boolean;
  isSelected: boolean;
}

const DEFAULT_STATIONS: Station[] = [
  {
    id: 'st-01',
    stationNumber: 1,
    stationCode: 'PS5-01',
    name: 'PS5 CONSOLE 01',
    type: 'PS5',
    hourlyRate: 500,
    specifications: 'Ultra-High Speed SSD, DualSense™ Wireless Controller',
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
    specifications: '4K-TV Gaming, Up to 120fps with 120Hz Output',
    controllersCount: 4,
    imageUrl: '/assets/images/ps5_console_02.jpg',
    active: true
  }
];

const DEFAULT_GAMES: Game[] = [
  {
    id: 'game-01',
    title: 'CYBERPUNK 2077',
    genre: 'Action RPG',
    coverImage: '/assets/images/game_cyberpunk.jpg'
  },
  {
    id: 'game-02',
    title: 'GRAN TURISMO 7',
    genre: 'Racing Sim',
    coverImage: '/assets/images/game_granturismo.jpg'
  },
  {
    id: 'game-03',
    title: 'ELDEN RING',
    genre: 'Action RPG',
    coverImage: '/assets/images/game_eldenring.jpg'
  },
  {
    id: 'game-04',
    title: 'TEKKEN 8',
    genre: 'Fighting',
    coverImage: '/assets/images/game_tekken.jpg'
  }
];

const DEFAULT_SLOTS: DisplaySlot[] = [
  { id: 'slot-10-11', startTime: '10:00 AM', endTime: '11:00 AM', rawStart: '10:00', rawEnd: '11:00', durationHours: 1, isAvailable: true, isSelected: false },
  { id: 'slot-11-12', startTime: '11:00 AM', endTime: '12:00 PM', rawStart: '11:00', rawEnd: '12:00', durationHours: 1, isAvailable: true, isSelected: false },
  { id: 'slot-12-13', startTime: '12:00 PM', endTime: '01:00 PM', rawStart: '12:00', rawEnd: '13:00', durationHours: 1, isAvailable: true, isSelected: true },
  { id: 'slot-13-14', startTime: '01:00 PM', endTime: '02:00 PM', rawStart: '13:00', rawEnd: '14:00', durationHours: 1, isAvailable: false, isSelected: false },
  { id: 'slot-14-15', startTime: '02:00 PM', endTime: '03:00 PM', rawStart: '14:00', rawEnd: '15:00', durationHours: 1, isAvailable: true, isSelected: false },
  { id: 'slot-15-16', startTime: '03:00 PM', endTime: '04:00 PM', rawStart: '15:00', rawEnd: '16:00', durationHours: 1, isAvailable: false, isSelected: false }
];

@Component({
  selector: 'gc-bookings',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    ButtonComponent,
    ModalComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './bookings.component.html',
  styleUrl: './bookings.component.scss'
})
export class BookingsComponent implements OnInit {
  private readonly bookingService = inject(BookingService);
  readonly authService = inject(AuthService);

  // Signals for state with immediate non-empty defaults
  readonly stations = signal<Station[]>(DEFAULT_STATIONS);
  readonly games = signal<Game[]>(DEFAULT_GAMES);
  readonly loading = signal<boolean>(false);
  readonly slotsLoading = signal<boolean>(false);

  // Selected date state initialized to current month and today's date
  private readonly initialDate = new Date();
  readonly currentYear = signal<number>(this.initialDate.getFullYear());
  readonly currentMonth = signal<number>(this.initialDate.getMonth()); // 0-indexed
  readonly selectedDateStr = signal<string>(
    `${this.initialDate.getFullYear()}-${String(this.initialDate.getMonth() + 1).padStart(2, '0')}-${String(this.initialDate.getDate()).padStart(2, '0')}`
  );

  // Active game stations only for display on the booking page
  readonly activeStations = computed<Station[]>(() => {
    return this.stations().filter((s) => s.active !== false);
  });

  // Selected station
  readonly selectedStationId = signal<string>('st-01');

  // Selected time slot(s)
  readonly availableSlots = signal<DisplaySlot[]>(DEFAULT_SLOTS);
  readonly selectedSlotId = signal<string>('slot-12-13');

  // Selected game
  readonly selectedGameId = signal<string>('game-01');

  // Duration in hours: 1 hour session as requested
  readonly sessionHours = signal<number>(1);

  // Loyalty points discount (defaults to off to clearly show full 1-hour amount)
  readonly loyaltyPointsBalance = signal<number>(1250);
  readonly redeemLoyalty = signal<boolean>(false);
  readonly canRedeemLoyalty = computed(() => this.loyaltyPointsBalance() >= 100);

  // Dynamic calculation for loyalty points redemption according to business rules:
  // - Minimum 100 points
  // - Multiples of 10 points
  // - 1 Point = 0.50 LKR
  // - Maximum discount = 50% of booking subtotal
  // - Benchmark voucher: 600 points = LKR 300.00 discount (or max allowed up to balance/cap)
  readonly effectivePointsToRedeem = computed(() => {
    if (!this.redeemLoyalty() || !this.canRedeemLoyalty()) {
      return 0;
    }
    const maxDiscountLkr = this.subtotalAmount() * 0.5;
    const maxPointsByCap = Math.floor(maxDiscountLkr / 0.5);
    const targetPoints = Math.min(this.loyaltyPointsBalance(), maxPointsByCap);
    const chosenPoints = targetPoints >= 600 ? 600 : targetPoints;
    const stepped = Math.floor(chosenPoints / 10) * 10;
    return stepped >= 100 ? stepped : 0;
  });

  readonly loyaltyDiscountAmount = computed(() => {
    return this.effectivePointsToRedeem() * 0.5;
  });

  // Payment / Checkout modal (card payments only)
  readonly paymentModalOpen = signal<boolean>(false);
  readonly paymentMethod = signal<'CARD'>('CARD');
  readonly isProcessingPayment = signal<boolean>(false);
  readonly bookingSuccessReceipt = signal<BookingResponse | null>(null);
  readonly bookingErrorMessage = signal<string | null>(null);

  // Card form fields for modal
  cardNumber = '4242 •••• •••• 4242';
  cardExpiry = '12/28';
  cardCvv = '888';
  cardholderName = 'Player One';

  // Computed values
  readonly monthNames = [
    'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
    'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'
  ];

  readonly currentMonthTitle = computed(() => {
    return `${this.monthNames[this.currentMonth()]} ${this.currentYear()}`;
  });

  readonly isCurrentOrPastMonth = computed(() => {
    const now = new Date();
    const currY = now.getFullYear();
    const currM = now.getMonth();
    return (
      this.currentYear() < currY ||
      (this.currentYear() === currY && this.currentMonth() <= currM)
    );
  });

  readonly selectedStation = computed<Station>(() => {
    const list = this.activeStations();
    return (
      list.find((s) => s.id === this.selectedStationId()) ||
      list[0] ||
      DEFAULT_STATIONS[0]
    );
  });

  readonly selectedGame = computed<Game>(() => {
    return (
      this.games().find((g) => g.id === this.selectedGameId()) ||
      this.games()[0] ||
      DEFAULT_GAMES[0]
    );
  });

  readonly selectedSlot = computed<DisplaySlot | null>(() => {
    return this.availableSlots().find((s) => s.id === this.selectedSlotId() && s.isAvailable) || null;
  });

  readonly formattedSelectedDate = computed(() => {
    const parts = this.selectedDateStr().split('-');
    if (parts.length !== 3) return this.selectedDateStr();
    const year = parts[0];
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const shortMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${shortMonths[month]} ${day}, ${year}`;
  });

  readonly baseHourlyRate = computed(() => {
    return this.selectedStation()?.hourlyRate || 500;
  });

  readonly subtotalAmount = computed(() => {
    return this.baseHourlyRate() * this.sessionHours();
  });

  readonly totalAmount = computed(() => {
    const discount = this.redeemLoyalty() ? this.loyaltyDiscountAmount() : 0;
    return Math.max(0, this.subtotalAmount() - discount);
  });

  readonly calendarDays = computed(() => {
    const year = this.currentYear();
    const month = this.currentMonth();
    const selectedDate = this.selectedDateStr();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    // Monday is index 0 in our week: Mo, Tu, We, Th, Fr, Sa, Su
    // JS getDay(): Sunday = 0, Monday = 1 ... Saturday = 6
    let startingDayOfWeek = firstDay.getDay() - 1;
    if (startingDayOfWeek === -1) startingDayOfWeek = 6;

    const days: CalendarDay[] = [];

    // Today's formatted date string comparing against real system today
    const today = new Date();
    const todayStr = this.formatDate(today);
    const effectiveTodayStr = todayStr;

    // Previous month trailing days (always past relative to the current viewing month)
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const dayNum = prevMonthLastDay - i;
      const prevDate = new Date(year, month - 1, dayNum);
      const prevDateStr = this.formatDate(prevDate);
      const isWeekend = prevDate.getDay() === 0 || prevDate.getDay() === 6;
      days.push({
        dayNumber: dayNum,
        dateStr: prevDateStr,
        isCurrentMonth: false,
        isSelected: prevDateStr === selectedDate,
        isToday: false,
        isPast: true,
        isWeekend
      });
    }

    // Current month days
    const totalDaysInMonth = lastDay.getDate();

    for (let day = 1; day <= totalDaysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateStr = this.formatDate(date);
      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
      const isPast = dateStr < effectiveTodayStr;
      const isToday = dateStr === effectiveTodayStr;

      days.push({
        dayNumber: day,
        dateStr,
        isCurrentMonth: true,
        isSelected: dateStr === selectedDate,
        isToday,
        isPast,
        isWeekend
      });
    }

    // Trailing days for next month to complete row (e.g. up to next multiple of 7)
    const remaining = (7 - (days.length % 7)) % 7;
    for (let day = 1; day <= remaining; day++) {
      const nextDate = new Date(year, month + 1, day);
      const nextDateStr = this.formatDate(nextDate);
      const isWeekend = nextDate.getDay() === 0 || nextDate.getDay() === 6;
      const isPast = nextDateStr < effectiveTodayStr;
      days.push({
        dayNumber: day,
        dateStr: nextDateStr,
        isCurrentMonth: false,
        isSelected: nextDateStr === selectedDate,
        isToday: false,
        isPast,
        isWeekend
      });
    }

    return days;
  });

  ngOnInit(): void {
    this.loadInitialData();
  }

  loadInitialData(): void {
    this.loading.set(true);
    this.bookingService.getStations().subscribe({
      next: (stations) => {
        if (stations && stations.length > 0) {
          // Filter to show active game stations only
          const activeOnly = stations.filter((s) => s.active !== false);
          this.stations.set(activeOnly.length > 0 ? activeOnly : stations);
          // Prefer CONSOLE-01 (or first available active station) so real backend UUID is selected
          const preferred = activeOnly.find((s) => s.stationCode === 'CONSOLE-01') || activeOnly[0] || stations[0];
          if (preferred) {
            this.selectedStationId.set(preferred.id);
          }
        }
        this.loadGames();
      },
      error: () => {
        this.loadGames();
      }
    });
  }

  private loadGames(): void {
    this.bookingService.getGames().subscribe({
      next: (games) => {
        if (games && games.length > 0) {
          this.games.set(games);
        }
        this.loadSlotsForDate();
        this.loadLoyalty();
        this.loading.set(false);
      },
      error: () => {
        this.loadSlotsForDate();
        this.loadLoyalty();
        this.loading.set(false);
      }
    });
  }

  private loadLoyalty(): void {
    this.bookingService.getLoyaltyBalance().subscribe({
      next: (loyalty) => {
        if (loyalty) {
          const balance = loyalty.pointsBalance ?? 0;
          this.loyaltyPointsBalance.set(balance);
          if (balance < 100) {
            this.redeemLoyalty.set(false);
          }
        }
      }
    });
  }

  loadSlotsForDate(): void {
    this.slotsLoading.set(true);
    const stationId = this.selectedStationId();
    const date = this.selectedDateStr();

    this.bookingService.getStationAvailability(stationId, date).subscribe({
      next: (slots) => {
        if (slots && slots.length > 0) {
          const displaySlots: DisplaySlot[] = slots.map((s, idx) => {
            const startFormatted = this.formatTimeString(s.startTime);
            const endFormatted = this.formatTimeString(s.endTime);
            const id = `slot-${idx}-${this.getCleanTimeId(s.startTime)}`;
            return {
              id,
              startTime: startFormatted,
              endTime: endFormatted,
              rawStart: s.startTime,
              rawEnd: s.endTime,
              durationHours: 1,
              isAvailable: s.isAvailable,
              isSelected: idx === 0
            };
          });
          this.availableSlots.set(displaySlots);
          const firstAvailable = displaySlots.find((s) => s.isAvailable);
          if (firstAvailable) {
            this.selectedSlotId.set(firstAvailable.id);
          } else {
            this.selectedSlotId.set('');
          }
        } else {
          this.availableSlots.set(this.getDefaultSlots());
        }
        this.slotsLoading.set(false);
      },
      error: () => {
        this.availableSlots.set(this.getDefaultSlots());
        this.slotsLoading.set(false);
      }
    });
  }

  private getDefaultSlots(): DisplaySlot[] {
    return [
      { id: 'slot-10-11', startTime: '10:00 AM', endTime: '11:00 AM', rawStart: '10:00', rawEnd: '11:00', durationHours: 1, isAvailable: true, isSelected: false },
      { id: 'slot-11-12', startTime: '11:00 AM', endTime: '12:00 PM', rawStart: '11:00', rawEnd: '12:00', durationHours: 1, isAvailable: true, isSelected: false },
      { id: 'slot-12-13', startTime: '12:00 PM', endTime: '01:00 PM', rawStart: '12:00', rawEnd: '13:00', durationHours: 1, isAvailable: true, isSelected: true },
      { id: 'slot-13-14', startTime: '01:00 PM', endTime: '02:00 PM', rawStart: '13:00', rawEnd: '14:00', durationHours: 1, isAvailable: false, isSelected: false },
      { id: 'slot-14-15', startTime: '02:00 PM', endTime: '03:00 PM', rawStart: '14:00', rawEnd: '15:00', durationHours: 1, isAvailable: true, isSelected: false },
      { id: 'slot-15-16', startTime: '03:00 PM', endTime: '04:00 PM', rawStart: '15:00', rawEnd: '16:00', durationHours: 1, isAvailable: false, isSelected: false }
    ];
  }

  prevMonth(): void {
    if (this.isCurrentOrPastMonth()) {
      return;
    }
    if (this.currentMonth() === 0) {
      this.currentMonth.set(11);
      this.currentYear.update((y) => y - 1);
    } else {
      this.currentMonth.update((m) => m - 1);
    }
  }

  nextMonth(): void {
    if (this.currentMonth() === 11) {
      this.currentMonth.set(0);
      this.currentYear.update((y) => y + 1);
    } else {
      this.currentMonth.update((m) => m + 1);
    }
  }

  selectDate(day: CalendarDay): void {
    if (day.isPast || !day.isCurrentMonth) {
      return;
    }
    this.selectedDateStr.set(day.dateStr);
    this.loadSlotsForDate();
  }

  selectSlot(slot: DisplaySlot): void {
    if (!slot.isAvailable) return;
    this.selectedSlotId.set(slot.id);
  }

  selectStation(stationId: string): void {
    this.selectedStationId.set(stationId);
    this.loadSlotsForDate();
  }

  selectGame(gameId: string): void {
    this.selectedGameId.set(gameId);
  }

  toggleLoyalty(): void {
    if (!this.canRedeemLoyalty()) {
      this.redeemLoyalty.set(false);
      return;
    }
    this.redeemLoyalty.update((val) => !val);
  }

  onProceedToPayment(): void {
    if (!this.selectedSlot() || !this.selectedSlot()?.isAvailable) {
      return;
    }
    this.paymentModalOpen.set(true);
  }

  closePaymentModal(): void {
    this.paymentModalOpen.set(false);
    this.bookingSuccessReceipt.set(null);
    this.bookingErrorMessage.set(null);
  }

  confirmPayment(): void {
    const slot = this.selectedSlot();
    if (!slot || !slot.isAvailable) {
      this.bookingErrorMessage.set('Please select an active, available time slot.');
      return;
    }

    this.isProcessingPayment.set(true);
    this.bookingErrorMessage.set(null);

    const bookingPayload = {
      stationId: this.selectedStationId(),
      bookingDate: this.selectedDateStr(),
      startTime: slot?.rawStart || '12:00',
      endTime: slot?.rawEnd || '13:00',
      paymentMethod: this.paymentMethod(),
      pointsToRedeem: this.effectivePointsToRedeem()
    };

    this.bookingService.createBooking(bookingPayload).subscribe({
      next: (response) => {
        this.isProcessingPayment.set(false);
        this.bookingSuccessReceipt.set(response);
        // Refresh slots and loyalty balance from backend
        this.loadSlotsForDate();
        this.loadLoyalty();
      },
      error: (err) => {
        this.isProcessingPayment.set(false);
        const errMsg =
          err?.error?.message ||
          err?.message ||
          'Failed to complete booking. Please check payment details or try another slot.';
        this.bookingErrorMessage.set(errMsg);
      }
    });
  }

  private formatDate(d: Date): string {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private formatTimeString(time: string): string {
    if (!time) return '';
    if (time.includes('AM') || time.includes('PM')) return time;
    if (time.includes('T') || time.endsWith('Z')) {
      const d = new Date(time);
      if (!isNaN(d.getTime())) {
        return d.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
          timeZone: 'Asia/Colombo'
        });
      }
    }
    const [hStr, mStr] = time.split(':');
    let h = parseInt(hStr, 10);
    const m = mStr || '00';
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    h = h ? h : 12;
    const formattedH = String(h).padStart(2, '0');
    return `${formattedH}:${m} ${ampm}`;
  }

  private getCleanTimeId(time: string): string {
    return time.replace(/[^a-zA-Z0-9]/g, '');
  }
}
