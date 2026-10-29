import {
  Component,
  OnInit,
  OnDestroy,
  effect,
  inject,
  signal,
  computed,
  ChangeDetectionStrategy,
  ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { BookingService } from '../../core/services/booking.service';
import { AuthService } from '../../core/services/auth.service';
import { NotificationSocketService } from '../../core/services/notification-socket.service';
import { Station, Game, BookingResponse } from '../../shared/models';
import { ButtonComponent } from '../../shared/ui/button/button.component';
import { ModalComponent } from '../../shared/ui/modal/modal.component';
import { SkeletonComponent } from '../../shared/ui/skeleton/skeleton.component';
import { EmptyStateComponent } from '../../shared/ui/empty-state/empty-state.component';
import { BadgeComponent } from '../../shared/ui/badge/badge.component';

import {
  DisplaySlot,
  formatDateToYMD,
  formatTimeString,
  getCleanTimeId,
  normalizeSlotHourMinute
} from '../../core/utils/slot.utils';

export interface CalendarDay {
  dayNumber: number;
  dateStr: string; // YYYY-MM-DD
  isCurrentMonth: boolean;
  isSelected: boolean;
  isToday: boolean;
  isPast: boolean;
  isWeekend: boolean;
}

export type { DisplaySlot };

@Component({
  selector: 'gc-bookings',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    ButtonComponent,
    ModalComponent,
    SkeletonComponent,
    EmptyStateComponent,
    BadgeComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './bookings.component.html',
  styleUrl: './bookings.component.scss'
})
export class BookingsComponent implements OnInit, OnDestroy {
  private readonly bookingService = inject(BookingService);
  private readonly notifSocketService = inject(NotificationSocketService);
  private readonly route = inject(ActivatedRoute);
  private readonly cdr = inject(ChangeDetectorRef);
  readonly authService = inject(AuthService);

  // ── Station / Game state ────────────────────────────────────────────────────
  readonly stations = signal<Station[]>([]);
  readonly stationGames = signal<Game[]>([]);
  readonly loading = signal<boolean>(true);
  readonly slotsLoading = signal<boolean>(false);
  readonly gamesLoading = signal<boolean>(false);

  // ── Selected date state (initialized to today) ──────────────────────────────
  private readonly initialDate = new Date();
  readonly currentYear = signal<number>(this.initialDate.getFullYear());
  readonly currentMonth = signal<number>(this.initialDate.getMonth()); // 0-indexed
  readonly selectedDateStr = signal<string>(
    `${this.initialDate.getFullYear()}-${String(this.initialDate.getMonth() + 1).padStart(2, '0')}-${String(this.initialDate.getDate()).padStart(2, '0')}`
  );

  readonly activeStations = computed<Station[]>(() => this.stations().filter((s) => s.active !== false));

  // ── Selections ──────────────────────────────────────────────────────────────
  readonly selectedStationId = signal<string>('');
  readonly availableSlots = signal<DisplaySlot[]>([]);
  readonly selectedSlotId = signal<string>('');
  readonly selectedGameId = signal<string>('');

  // ── Session / Payment ────────────────────────────────────────────────────────
  readonly sessionHours = signal<number>(1);
  readonly loyaltyPointsBalance = signal<number>(0);
  readonly redeemLoyalty = signal<boolean>(false);
  readonly canRedeemLoyalty = computed(() => this.loyaltyPointsBalance() >= 100);

  readonly effectivePointsToRedeem = computed(() => {
    if (!this.redeemLoyalty() || !this.canRedeemLoyalty()) return 0;
    const maxDiscountLkr = this.subtotalAmount() * 0.5;
    const maxPointsByCap = Math.floor(maxDiscountLkr / 0.5);
    const targetPoints = Math.min(this.loyaltyPointsBalance(), maxPointsByCap);
    const chosenPoints = targetPoints >= 600 ? 600 : targetPoints;
    const stepped = Math.floor(chosenPoints / 10) * 10;
    return stepped >= 100 ? stepped : 0;
  });

  readonly loyaltyDiscountAmount = computed(() => this.effectivePointsToRedeem() * 0.5);

  readonly paymentModalOpen = signal<boolean>(false);
  readonly paymentMethod = signal<'CARD'>('CARD');
  readonly isProcessingPayment = signal<boolean>(false);
  readonly bookingSuccessReceipt = signal<BookingResponse | null>(null);
  readonly bookingErrorMessage = signal<string | null>(null);

  // ── Hold Timer state (2-minute temporary lock) ──────────────────────────────
  readonly holdSecondsRemaining = signal<number>(120);
  private holdTimerInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    // Real-time synchronization of slot locks, bookings, and releases across all customers
    effect(() => {
      const getEvent = typeof this.notifSocketService.lastSlotEvent === 'function'
        ? this.notifSocketService.lastSlotEvent()
        : null;
      if (getEvent) {
        if (getEvent.type === 'BOOKED' && (!getEvent.stationId || getEvent.stationId === this.selectedStationId())) {
          this.loadSlotsForDate();
        } else {
          this.cdr.markForCheck();
        }
      }
      // Re-evaluate template whenever activeSlotLocks signal changes
      if (typeof this.notifSocketService.activeSlotLocks === 'function') {
        this.notifSocketService.activeSlotLocks();
      }
      this.cdr.markForCheck();
    });
  }

  // Card form fields with dynamic formatting
  readonly cardNumberSignal = signal<string>('4242 4242 4242 4242');
  get cardNumber(): string {
    return this.cardNumberSignal();
  }
  set cardNumber(val: string) {
    this.cardNumberSignal.set(val);
  }
  cardExpiry = '12/28';
  cardCvv = '888';
  cardholderName = 'Player One';

  // Detected card brand: visa, mastercard, amex, or generic
  readonly cardBrand = computed<'visa' | 'mastercard' | 'amex' | 'generic'>(() => {
    const raw = this.cardNumberSignal().replace(/\D/g, '');
    if (/^4/.test(raw)) return 'visa';
    if (/^5[1-5]/.test(raw) || /^2[2-7]/.test(raw)) return 'mastercard';
    if (/^3[47]/.test(raw)) return 'amex';
    return 'generic';
  });

  readonly isCardNumberValid = computed<boolean>(() => {
    const raw = this.cardNumberSignal().replace(/\D/g, '');
    if (raw.length < 13) return false;
    return this.validateLuhn(raw);
  });

  validateLuhn(val: string): boolean {
    let sum = 0;
    let shouldDouble = false;
    for (let i = val.length - 1; i >= 0; i--) {
      let digit = parseInt(val.charAt(i), 10);
      if (shouldDouble) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      sum += digit;
      shouldDouble = !shouldDouble;
    }
    return sum % 10 === 0;
  }

  onCardNumberInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    let val = input.value.replace(/\D/g, '');
    if (val.length > 16) val = val.substring(0, 16);
    const groups = val.match(/.{1,4}/g);
    this.cardNumber = groups ? groups.join(' ') : val;
    input.value = this.cardNumber;
  }

  onCardExpiryInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    let val = input.value.replace(/\D/g, '');
    if (val.length > 4) val = val.substring(0, 4);
    if (val.length >= 3) {
      this.cardExpiry = val.substring(0, 2) + '/' + val.substring(2);
    } else {
      this.cardExpiry = val;
    }
    input.value = this.cardExpiry;
  }

  isSlotHeld(slot: DisplaySlot): boolean {
    if (!slot) return false;
    const timeSlot = normalizeSlotHourMinute(slot.rawStart || slot.startTime || slot.id);
    return this.notifSocketService.isSlotHeldByOther(
      this.selectedStationId(),
      this.selectedDateStr(),
      timeSlot
    );
  }

  // ── Computed helpers ─────────────────────────────────────────────────────────
  readonly monthNames = [
    'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
    'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'
  ];

  readonly currentMonthTitle = computed(() => `${this.monthNames[this.currentMonth()]} ${this.currentYear()}`);

  readonly isCurrentOrPastMonth = computed(() => {
    const now = new Date();
    const currY = now.getFullYear();
    const currM = now.getMonth();
    return (
      this.currentYear() < currY ||
      (this.currentYear() === currY && this.currentMonth() <= currM)
    );
  });

  readonly selectedStation = computed<Station | null>(() => {
    return this.activeStations().find((s) => s.id === this.selectedStationId()) ?? null;
  });

  readonly selectedGame = computed<Game | null>(() => {
    return this.stationGames().find((g) => g.id === this.selectedGameId()) ?? null;
  });

  readonly selectedSlot = computed<DisplaySlot | null>(() => {
    return this.availableSlots().find((s) => s.id === this.selectedSlotId() && s.isAvailable) ?? null;
  });

  /** Payment button enabled only when station + game + slot are all selected */
  readonly canProceedToPayment = computed(() => {
    return !!this.selectedStation() && !!this.selectedGame() && !!this.selectedSlot();
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

  readonly baseHourlyRate = computed(() => this.selectedStation()?.hourlyRate || 500);
  readonly subtotalAmount = computed(() => this.baseHourlyRate() * this.sessionHours());
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

    let startingDayOfWeek = firstDay.getDay() - 1;
    if (startingDayOfWeek === -1) startingDayOfWeek = 6;

    const days: CalendarDay[] = [];
    const today = new Date();
    const todayStr = this.formatDate(today);
    const prevMonthLastDay = new Date(year, month, 0).getDate();

    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const dayNum = prevMonthLastDay - i;
      const prevDate = new Date(year, month - 1, dayNum);
      const prevDateStr = this.formatDate(prevDate);
      days.push({
        dayNumber: dayNum,
        dateStr: prevDateStr,
        isCurrentMonth: false,
        isSelected: prevDateStr === selectedDate,
        isToday: false,
        isPast: true,
        isWeekend: prevDate.getDay() === 0 || prevDate.getDay() === 6
      });
    }

    for (let day = 1; day <= lastDay.getDate(); day++) {
      const date = new Date(year, month, day);
      const dateStr = this.formatDate(date);
      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
      days.push({
        dayNumber: day,
        dateStr,
        isCurrentMonth: true,
        isSelected: dateStr === selectedDate,
        isToday: dateStr === todayStr,
        isPast: dateStr < todayStr,
        isWeekend
      });
    }

    const remaining = (7 - (days.length % 7)) % 7;
    for (let day = 1; day <= remaining; day++) {
      const nextDate = new Date(year, month + 1, day);
      const nextDateStr = this.formatDate(nextDate);
      days.push({
        dayNumber: day,
        dateStr: nextDateStr,
        isCurrentMonth: false,
        isSelected: nextDateStr === selectedDate,
        isToday: false,
        isPast: nextDateStr < todayStr,
        isWeekend: nextDate.getDay() === 0 || nextDate.getDay() === 6
      });
    }
    return days;
  });

  // ── Lifecycle ─────────────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.loadInitialData();
  }

  private loadInitialData(): void {
    this.loading.set(true);

    // Read query params FIRST, then load stations
    const params = this.route.snapshot.queryParams;
    const paramStationId = params['stationId'] as string | undefined;
    const paramGameId = params['gameId'] as string | undefined;

    this.bookingService.getStations().subscribe({
      next: (stations) => {
        const active = stations.filter((s) => s.active !== false);
        this.stations.set(active.length > 0 ? active : stations);

        // Determine initial station
        let targetStationId = '';
        if (paramStationId) {
          const found = active.find((s) => s.id === paramStationId);
          targetStationId = found ? paramStationId : (active[0]?.id || '');
        } else if (paramGameId) {
          // gameId only — load the game's stations, then pick the first valid one
          this.bookingService.getGameStations(paramGameId).subscribe({
            next: (gameStations) => {
              const validStation = active.find((s) => gameStations.some((gs) => gs.id === s.id)) || active[0];
              if (validStation) {
                this.selectedStationId.set(validStation.id);
                this.loadStationGamesWithGameSelection(validStation.id, paramGameId);
                this.loadSlotsForDate();
              }
              this.loading.set(false);
              this.cdr.markForCheck();
            },
            error: () => {
              if (active[0]) {
                this.selectedStationId.set(active[0].id);
                this.loadStationGames(active[0].id);
                this.loadSlotsForDate();
              }
              this.loading.set(false);
              this.cdr.markForCheck();
            }
          });
          this.loadLoyalty();
          return; // early return — async path above handles the rest
        } else {
          const preferred = active.find((s) => s.stationCode === 'CONSOLE-01') || active[0];
          targetStationId = preferred?.id || '';
        }

        if (targetStationId) {
          this.selectedStationId.set(targetStationId);
          if (paramGameId) {
            this.loadStationGamesWithGameSelection(targetStationId, paramGameId);
          } else {
            this.loadStationGames(targetStationId);
          }
          this.loadSlotsForDate();
        }
        this.loadLoyalty();
        this.loading.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading.set(false);
        this.cdr.markForCheck();
      }
    });
  }

  /** Load games for a station and pre-select a specific game if it's valid */
  private loadStationGamesWithGameSelection(stationId: string, gameId: string): void {
    this.gamesLoading.set(true);
    this.bookingService.getStationGames(stationId).subscribe({
      next: (games) => {
        this.stationGames.set(games);
        const validGame = games.find((g) => g.id === gameId);
        if (validGame) {
          this.selectedGameId.set(gameId);
        } else {
          this.selectedGameId.set('');
          // Game not on this station — show warning via error message area
          this.bookingErrorMessage.set(
            'The selected game is not installed on this station. Please choose a game from the list below.'
          );
        }
        this.gamesLoading.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.gamesLoading.set(false);
        this.cdr.markForCheck();
      }
    });
  }

  private loadStationGames(stationId: string): void {
    this.gamesLoading.set(true);
    this.stationGames.set([]);
    this.selectedGameId.set('');
    this.bookingService.getStationGames(stationId).subscribe({
      next: (games) => {
        this.stationGames.set(games);
        this.gamesLoading.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.gamesLoading.set(false);
        this.cdr.markForCheck();
      }
    });
  }

  private loadLoyalty(): void {
    this.bookingService.getLoyaltyBalance().subscribe({
      next: (loyalty) => {
        if (loyalty) {
          const balance = loyalty.pointsBalance ?? 0;
          this.loyaltyPointsBalance.set(balance);
          if (balance < 100) this.redeemLoyalty.set(false);
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
          this.selectedSlotId.set(firstAvailable?.id || '');
        } else {
          this.availableSlots.set(this.getDefaultSlots());
          this.selectedSlotId.set('');
        }
        this.slotsLoading.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.availableSlots.set(this.getDefaultSlots());
        this.slotsLoading.set(false);
        this.cdr.markForCheck();
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

  // ── Calendar navigation ───────────────────────────────────────────────────────

  prevMonth(): void {
    if (this.isCurrentOrPastMonth()) return;
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
    if (day.isPast || !day.isCurrentMonth) return;
    this.selectedDateStr.set(day.dateStr);
    this.loadSlotsForDate();
  }

  selectSlot(slot: DisplaySlot): void {
    if (!slot.isAvailable || this.isSlotHeld(slot)) return;
    this.selectedSlotId.set(slot.id);
  }

  /** Selecting a station resets the game selection and loads that station's games */
  selectStation(stationId: string): void {
    if (this.selectedStationId() === stationId) return;
    this.selectedStationId.set(stationId);
    this.selectedGameId.set(''); // reset game when station changes
    this.bookingErrorMessage.set(null);
    this.loadStationGames(stationId);
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

  // ── Payment flow & Slot Hold Timer ──────────────────────────────────────────

  startHoldTimer(): void {
    this.stopHoldTimer();
    this.holdSecondsRemaining.set(120); // 2 minutes (120 seconds) hold
    this.holdTimerInterval = setInterval(() => {
      const current = this.holdSecondsRemaining();
      if (current <= 1) {
        this.stopHoldTimer();
        this.holdSecondsRemaining.set(0);
        this.handleHoldExpired();
      } else {
        this.holdSecondsRemaining.set(current - 1);
        this.cdr.markForCheck();
      }
    }, 1000);
  }

  stopHoldTimer(): void {
    if (this.holdTimerInterval) {
      clearInterval(this.holdTimerInterval);
      this.holdTimerInterval = null;
    }
  }

  private handleHoldExpired(): void {
    const slot = this.selectedSlot();
    if (slot && !this.bookingSuccessReceipt()) {
      const timeToUnlock = normalizeSlotHourMinute(slot.rawStart || slot.startTime || slot.id);
      this.notifSocketService.unlockSlot(
        this.selectedStationId(),
        this.selectedDateStr(),
        timeToUnlock
      );
    }
    this.paymentModalOpen.set(false);
    this.bookingErrorMessage.set('Your 2-minute booking hold expired. The slot has been released back to Available.');
    this.cdr.markForCheck();
  }

  formatHoldTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  onProceedToPayment(): void {
    if (!this.canProceedToPayment()) return;
    const slot = this.selectedSlot();
    if (!slot || this.isSlotHeld(slot)) {
      this.bookingErrorMessage.set('This time slot is currently being booked by another customer. Please choose a different slot.');
      return;
    }
    const timeToLock = normalizeSlotHourMinute(slot.rawStart || slot.startTime || slot.id);
    this.notifSocketService.lockSlot(
      this.selectedStationId(),
      this.selectedDateStr(),
      timeToLock
    );
    this.startHoldTimer();
    this.bookingErrorMessage.set(null);
    this.paymentModalOpen.set(true);
  }

  closePaymentModal(): void {
    this.stopHoldTimer();
    const slot = this.selectedSlot();
    if (slot && !this.bookingSuccessReceipt()) {
      const timeToUnlock = normalizeSlotHourMinute(slot.rawStart || slot.startTime || slot.id);
      this.notifSocketService.unlockSlot(
        this.selectedStationId(),
        this.selectedDateStr(),
        timeToUnlock
      );
    }
    this.paymentModalOpen.set(false);
    this.bookingSuccessReceipt.set(null);
    this.bookingErrorMessage.set(null);
  }

  ngOnDestroy(): void {
    this.stopHoldTimer();
    // If user navigates away with an active unconfirmed booking hold, roll back immediately
    if (this.paymentModalOpen() && !this.bookingSuccessReceipt()) {
      const slot = this.selectedSlot();
      if (slot) {
        const timeToUnlock = normalizeSlotHourMinute(slot.rawStart || slot.startTime || slot.id);
        this.notifSocketService.unlockSlot(
          this.selectedStationId(),
          this.selectedDateStr(),
          timeToUnlock
        );
      }
    }
  }

  confirmPayment(): void {
    const slot = this.selectedSlot();
    if (!slot || !slot.isAvailable) {
      this.bookingErrorMessage.set('Please select an available time slot.');
      return;
    }
    const gameId = this.selectedGameId();
    if (!gameId) {
      this.bookingErrorMessage.set('Please select a game before completing your booking.');
      return;
    }

    this.isProcessingPayment.set(true);
    this.bookingErrorMessage.set(null);

    this.bookingService.createBooking({
      stationId: this.selectedStationId(),
      gameId,
      bookingDate: this.selectedDateStr(),
      startTime: slot.rawStart || '12:00',
      endTime: slot.rawEnd || '13:00',
      paymentMethod: this.paymentMethod(),
      pointsToRedeem: this.effectivePointsToRedeem()
    }).subscribe({
      next: (response) => {
        this.stopHoldTimer();
        // Broadcast slot booked live across real-time socket
        const timeToConfirm = normalizeSlotHourMinute(slot.rawStart || slot.startTime || slot.id);
        this.notifSocketService.confirmSlotBooked(
          this.selectedStationId(),
          this.selectedDateStr(),
          timeToConfirm
        );

        // Enrich response with game title from local state
        const enriched: BookingResponse = {
          ...response,
          gameTitle: this.selectedGame()?.title || response.gameTitle
        };
        this.isProcessingPayment.set(false);
        this.bookingSuccessReceipt.set(enriched);
        const currentUserId = response.userId || this.authService.getUserId() || undefined;
        this.notifSocketService.sendNotification({
          type: 'BOOKING_CREATED',
          category: 'BOOKING',
          title: 'Booking Confirmed! 🎮',
          message: `${enriched.stationName || 'Station'} reserved for ${slot.startTime} - ${slot.endTime} (${enriched.gameTitle || 'Game'})`,
          referenceId: enriched.id,
          link: '/bookings',
          targetUserId: currentUserId,
          data: { bookingId: enriched.id, stationId: this.selectedStationId() }
        });
        this.loadSlotsForDate();
        this.loadLoyalty();
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.isProcessingPayment.set(false);
        const errCode: string = err?.error?.error || '';
        let errMsg: string;

        switch (errCode) {
          case 'GAME_ID_REQUIRED':
            errMsg = 'A game selection is required to complete your booking.';
            break;
          case 'GAME_NOT_FOUND':
            errMsg = 'The selected game could not be found. Please choose another game.';
            this.loadStationGames(this.selectedStationId());
            break;
          case 'GAME_INACTIVE':
            errMsg = 'This game is no longer available. Please choose another game.';
            this.loadStationGames(this.selectedStationId());
            break;
          case 'GAME_NOT_ON_STATION':
            errMsg = 'This game is not installed on the selected station. Please choose a different game.';
            this.selectedGameId.set('');
            this.loadStationGames(this.selectedStationId());
            break;
          default:
            errMsg = err?.error?.message || err?.message ||
              'Failed to complete booking. Please check payment details or try another slot.';
        }
        this.bookingErrorMessage.set(errMsg);
        this.cdr.markForCheck();
      }
    });
  }

  getStationTypeLabel(type: string): string {
    switch (type) {
      case 'PC': case 'PC_ESPORTS': return 'PC';
      case 'VR': return 'VR';
      default: return 'CONSOLE';
    }
  }

  getStationBadgeVariant(type: string): 'primary' | 'accent' | 'info' {
    switch (type) {
      case 'PC': case 'PC_ESPORTS': return 'primary';
      case 'VR': return 'accent';
      default: return 'info';
    }
  }

  // ── Private helpers ───────────────────────────────────────────────────────────

  private formatDate(d: Date): string {
    return formatDateToYMD(d);
  }

  private formatTimeString(time: string): string {
    return formatTimeString(time);
  }

  private getCleanTimeId(time: string): string {
    return getCleanTimeId(time);
  }
}
