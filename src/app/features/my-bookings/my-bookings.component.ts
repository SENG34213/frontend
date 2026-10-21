import {
  Component,
  inject,
  signal,
  computed,
  OnInit,
  ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { BookingService } from '../../core/services/booking.service';
import { ToastService } from '../../shared/ui/toast/toast.service';
import { BookingResponse, BookingStatus } from '../../shared/models/booking.model';
import { ApiError } from '../../shared/models/api-response.model';
import { CardComponent } from '../../shared/ui/card/card.component';
import { BadgeComponent, BadgeVariant } from '../../shared/ui/badge/badge.component';
import { TabsComponent, TabItem } from '../../shared/ui/tabs/tabs.component';
import { SkeletonComponent } from '../../shared/ui/skeleton/skeleton.component';
import { EmptyStateComponent } from '../../shared/ui/empty-state/empty-state.component';
import { ButtonComponent } from '../../shared/ui/button/button.component';
import { ModalComponent } from '../../shared/ui/modal/modal.component';
import {
  DisplaySlot,
  formatDateToYMD,
  formatTimeString,
  convertToIsoInstant,
  getSlotStartTimestamp,
  getSlotEndTimestamp,
  isWithinCutoffHours,
  calculateDurationHours,
  RESCHEDULE_CUTOFF_HOURS
} from '../../core/utils/slot.utils';

export interface BookingDisplayItem extends BookingResponse {
  formattedDate: string;
  formattedTimeSlot: string;
  displayStation: string;
  displayGame: string;
  displayAmount: number;
  badgeVariant: BadgeVariant;
  isUpcoming: boolean;
  sortTimestamp: number;
  canReschedule: boolean;
  isWithin2Hours: boolean;
  durationHours: number;
}

export interface DateOption {
  value: string;
  label: string;
}

@Component({
  selector: 'gc-my-bookings',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    CardComponent,
    BadgeComponent,
    TabsComponent,
    SkeletonComponent,
    EmptyStateComponent,
    ButtonComponent,
    ModalComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './my-bookings.component.html',
  styleUrl: './my-bookings.component.scss'
})
export class MyBookingsComponent implements OnInit {
  private readonly bookingService = inject(BookingService);
  private readonly toastService = inject(ToastService);

  readonly RESCHEDULE_CUTOFF_HOURS = RESCHEDULE_CUTOFF_HOURS;

  readonly allBookings = signal<BookingDisplayItem[]>([]);
  readonly activeTab = signal<'upcoming' | 'played'>('upcoming');
  readonly isLoading = signal<boolean>(true);
  readonly hasError = signal<boolean>(false);

  // ── Reschedule Modal State ──────────────────────────────────────────────────
  readonly isRescheduleModalOpen = signal<boolean>(false);
  readonly selectedBookingForReschedule = signal<BookingDisplayItem | null>(null);
  readonly selectedDateStr = signal<string>(formatDateToYMD(new Date()));
  readonly rescheduleSlots = signal<DisplaySlot[]>([]);
  readonly selectedSlotId = signal<string>('');
  readonly isSlotsLoading = signal<boolean>(false);
  readonly slotsError = signal<string | null>(null);
  readonly isSubmitting = signal<boolean>(false);
  readonly rescheduleError = signal<string | null>(null);

  // ── Session Review State (SDS Table C.3 / C.5) ──────────────────────────────
  readonly userReviews = signal<Record<string, any>>({});
  readonly isReviewModalOpen = signal<boolean>(false);
  readonly selectedBookingForReview = signal<BookingDisplayItem | null>(null);
  readonly reviewRating = signal<number>(5);
  readonly reviewComment = signal<string>('');
  readonly isSubmittingReview = signal<boolean>(false);
  readonly reviewError = signal<string | null>(null);

  // ── Computed Lists ──────────────────────────────────────────────────────────
  readonly upcomingBookings = computed(() => {
    return this.allBookings()
      .filter((b) => b.isUpcoming)
      .sort((a, b) => a.sortTimestamp - b.sortTimestamp); // soonest first
  });

  readonly playedBookings = computed(() => {
    return this.allBookings()
      .filter((b) => !b.isUpcoming)
      .sort((a, b) => b.sortTimestamp - a.sortTimestamp); // newest first
  });

  readonly tabs = computed<TabItem[]>(() => [
    {
      id: 'upcoming',
      label: 'Upcoming',
      badge: this.upcomingBookings().length
    },
    {
      id: 'played',
      label: 'Played',
      badge: this.playedBookings().length
    }
  ]);

  readonly currentList = computed(() => {
    return this.activeTab() === 'upcoming'
      ? this.upcomingBookings()
      : this.playedBookings();
  });

  // ── 30-Day Date Options for Reschedule Modal ─────────────────────────────────
  readonly dateOptions = computed<DateOption[]>(() => {
    const options: DateOption[] = [];
    const today = new Date();
    for (let i = 0; i < 30; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const val = formatDateToYMD(d);
      let label: string;
      if (i === 0) {
        label = `Today (${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })})`;
      } else if (i === 1) {
        label = `Tomorrow (${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })})`;
      } else {
        label = d.toLocaleDateString('en-GB', {
          weekday: 'short',
          day: 'numeric',
          month: 'short'
        });
      }
      options.push({ value: val, label });
    }
    return options;
  });

  readonly selectedSlot = computed<DisplaySlot | null>(() => {
    const id = this.selectedSlotId();
    if (!id) return null;
    return this.rescheduleSlots().find((s) => s.id === id && s.isAvailable) ?? null;
  });

  readonly hasAvailableSlots = computed<boolean>(() => {
    return this.rescheduleSlots().some((s) => s.isAvailable);
  });

  readonly canConfirmReschedule = computed<boolean>(() => {
    return !!this.selectedSlot() && !this.isSubmitting();
  });

  readonly selectedDateFormatted = computed<string>(() => {
    const dateStr = this.selectedDateStr();
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const d = new Date(year, month, day);
    return d.toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  });

  readonly selectedRangeFormatted = computed<string>(() => {
    const slot = this.selectedSlot();
    const booking = this.selectedBookingForReschedule();
    if (!slot || !booking) return '';
    const duration = booking.durationHours || 1;
    const slots = this.rescheduleSlots();
    const idx = slots.findIndex((s) => s.id === slot.id);
    const endSlot = slots[idx + duration - 1] || slot;
    return `${slot.startTime} – ${endSlot.endTime} (${duration} ${duration === 1 ? 'hr' : 'hrs'})`;
  });

  ngOnInit(): void {
    this.loadBookings();
  }

  loadBookings(): void {
    this.isLoading.set(true);
    this.hasError.set(false);

    this.bookingService.getMyBookings().subscribe({
      next: (list) => {
        const items = (list || []).map((b) => this.mapDisplayItem(b));
        this.allBookings.set(items);
        this.isLoading.set(false);
      },
      error: () => {
        this.hasError.set(true);
        this.isLoading.set(false);
      }
    });

    this.loadReviews();
  }

  loadReviews(): void {
    this.bookingService.getMyReviews().subscribe({
      next: (reviews) => {
        const map: Record<string, any> = {};
        if (Array.isArray(reviews)) {
          reviews.forEach((r) => {
            if (r.bookingId) map[r.bookingId] = r;
          });
        }
        this.userReviews.set(map);
      },
      error: () => {}
    });
  }

  openReviewModal(item: BookingDisplayItem): void {
    this.selectedBookingForReview.set(item);
    this.reviewRating.set(5);
    this.reviewComment.set('');
    this.reviewError.set(null);
    this.isReviewModalOpen.set(true);
  }

  closeReviewModal(): void {
    if (this.isSubmittingReview()) return;
    this.isReviewModalOpen.set(false);
    this.selectedBookingForReview.set(null);
    this.reviewError.set(null);
  }

  setRating(stars: number): void {
    this.reviewRating.set(stars);
  }

  submitReview(): void {
    const booking = this.selectedBookingForReview();
    if (!booking) return;

    this.isSubmittingReview.set(true);
    this.reviewError.set(null);

    this.bookingService.submitReview(booking.id, this.reviewRating(), this.reviewComment()).subscribe({
      next: (created) => {
        this.isSubmittingReview.set(false);
        this.toastService.success('Review Submitted', 'Thank you for rating your gaming session!');
        this.userReviews.update((map) => ({ ...map, [booking.id]: created }));
        this.closeReviewModal();
      },
      error: (err) => {
        this.isSubmittingReview.set(false);
        this.reviewError.set(err?.error?.message || 'Failed to submit review. Please try again.');
      }
    });
  }

  onTabChange(tabId: string): void {
    if (tabId === 'upcoming' || tabId === 'played') {
      this.activeTab.set(tabId);
    }
  }

  // ── Reschedule Flow ─────────────────────────────────────────────────────────

  openRescheduleModal(item: BookingDisplayItem): void {
    if (item.isWithin2Hours || !item.canReschedule) return;

    this.selectedBookingForReschedule.set(item);
    this.rescheduleError.set(null);
    this.slotsError.set(null);
    this.selectedSlotId.set('');

    const todayStr = formatDateToYMD(new Date());
    const initialDate = item.bookingDate && item.bookingDate >= todayStr ? item.bookingDate : todayStr;
    this.selectedDateStr.set(initialDate);

    this.isRescheduleModalOpen.set(true);
    this.loadRescheduleSlots(item.stationId, initialDate);
  }

  closeRescheduleModal(): void {
    if (this.isSubmitting()) return;
    this.isRescheduleModalOpen.set(false);
    this.selectedBookingForReschedule.set(null);
    this.selectedSlotId.set('');
    this.rescheduleError.set(null);
  }

  onDateSelectChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const newDate = target.value;
    if (newDate && newDate !== this.selectedDateStr()) {
      this.selectedDateStr.set(newDate);
      this.selectedSlotId.set('');
      this.rescheduleError.set(null);
      const booking = this.selectedBookingForReschedule();
      if (booking) {
        this.loadRescheduleSlots(booking.stationId, newDate);
      }
    }
  }

  retryLoadSlots(): void {
    const booking = this.selectedBookingForReschedule();
    if (booking) {
      this.loadRescheduleSlots(booking.stationId, this.selectedDateStr());
    }
  }

  loadRescheduleSlots(stationId: string, date: string): void {
    this.isSlotsLoading.set(true);
    this.slotsError.set(null);

    this.bookingService.getStationAvailability(stationId, date).subscribe({
      next: (slots) => {
        const booking = this.selectedBookingForReschedule();
        if (!booking) {
          this.isSlotsLoading.set(false);
          return;
        }

        const duration = Math.max(1, booking.durationHours || 1);

        const activeSlots = slots || [];

        const currStartMs = booking.sortTimestamp;
        const currEndMs = currStartMs + duration * 60 * 60 * 1000;

        const mappedSlots: DisplaySlot[] = activeSlots.map((s, idx) => {
          const startTimeFormatted = formatTimeString(s.startTime);
          const endTimeFormatted = formatTimeString(s.endTime);

          const slotStartMs = getSlotStartTimestamp(date, s.startTime);
          const slotEndMs = getSlotEndTimestamp(date, s.endTime);

          // Is this slot part of the user's current booking?
          const isCurrent =
            date === booking.bookingDate &&
            slotStartMs >= currStartMs &&
            slotEndMs <= currEndMs;

          return {
            id: `slot-${idx}-${s.startTime.replace(/[^a-zA-Z0-9]/g, '')}`,
            startTime: startTimeFormatted,
            endTime: endTimeFormatted,
            rawStart: s.startTime,
            rawEnd: s.endTime,
            durationHours: 1,
            isAvailable: s.isAvailable,
            isSelected: false,
            isCurrent
          };
        });

        // Evaluate valid starting slots for the required duration
        const evaluatedSlots: DisplaySlot[] = mappedSlots.map((slot, idx) => {
          let canFit = true;
          let disabledReason = '';

          const slotStartMs = getSlotStartTimestamp(date, slot.rawStart);

          // Rule 1: Booking's own current starting slot cannot be re-selected as the new slot
          if (slot.isCurrent && slotStartMs === currStartMs && duration === 1) {
            canFit = false;
            disabledReason = 'Current booking time';
          }

          // Rule 2: Must have enough consecutive slots for the entire duration
          if (canFit) {
            if (idx + duration > mappedSlots.length) {
              canFit = false;
              disabledReason = `Requires ${duration} consecutive slots`;
            } else {
              let prevEndMs = slotStartMs;
              for (let step = 0; step < duration; step++) {
                const target = mappedSlots[idx + step];
                const targetStartMs = getSlotStartTimestamp(date, target.rawStart);
                const targetEndMs = getSlotEndTimestamp(date, target.rawEnd);

                // Slot is free if either backend marked it available, or it is part of self booking
                const isTargetFree = target.isAvailable || target.isCurrent;

                if (!isTargetFree) {
                  canFit = false;
                  disabledReason = 'Slot unavailable';
                  break;
                }

                // Check continuous slot progression
                if (step > 0 && targetStartMs !== prevEndMs) {
                  canFit = false;
                  disabledReason = 'Slots are not consecutive';
                  break;
                }

                prevEndMs = targetEndMs;
              }

              // Rule 3: If the entire consecutive block equals the current booking range, not a valid reschedule
              if (canFit && date === booking.bookingDate && slotStartMs === currStartMs) {
                canFit = false;
                disabledReason = 'Current booking time';
              }
            }
          }

          return {
            ...slot,
            isAvailable: canFit,
            disabledReason
          };
        });

        this.rescheduleSlots.set(evaluatedSlots);
        this.isSlotsLoading.set(false);
      },
      error: () => {
        this.slotsError.set('Could not load availability for this date. Please try again.');
        this.isSlotsLoading.set(false);
      }
    });
  }

  selectRescheduleSlot(slot: DisplaySlot): void {
    if (!slot.isAvailable) return;
    this.selectedSlotId.set(slot.id);
  }

  confirmReschedule(): void {
    const booking = this.selectedBookingForReschedule();
    const slot = this.selectedSlot();
    if (!booking || !slot || this.isSubmitting()) return;

    this.isSubmitting.set(true);
    this.rescheduleError.set(null);

    const duration = Math.max(1, booking.durationHours || 1);
    const slots = this.rescheduleSlots();
    const idx = slots.findIndex((s) => s.id === slot.id);
    const endSlot = slots[idx + duration - 1] || slot;

    const startIso = convertToIsoInstant(this.selectedDateStr(), slot.rawStart);
    const endIso = convertToIsoInstant(this.selectedDateStr(), endSlot.rawEnd);

    this.bookingService
      .rescheduleBooking(booking.id, {
        stationId: booking.stationId,
        gameId: booking.gameId || '',
        startTime: startIso,
        endTime: endIso,
        bookingDate: this.selectedDateStr()
      })
      .subscribe({
        next: (updated) => {
          this.isSubmitting.set(false);
          this.isRescheduleModalOpen.set(false);

          const formattedNewDate = new Date(startIso).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            timeZone: 'Asia/Colombo'
          });
          const formattedNewTime = `${formatTimeString(startIso)} – ${formatTimeString(endIso)}`;

          this.toastService.success(
            `Booking rescheduled to ${formattedNewDate}, ${formattedNewTime}`
          );

          // Update booking item in current list and preserve soonest-first order
          const updatedItem = this.mapDisplayItem(updated);
          this.allBookings.update((items) =>
            items.map((item) => (item.id === updated.id ? updatedItem : item))
          );
          this.activeTab.set('upcoming');
          this.selectedBookingForReschedule.set(null);
        },
        error: (err: ApiError) => {
          this.isSubmitting.set(false);
          const code = err?.code || '';

          if (code === 'SLOT_UNAVAILABLE') {
            this.rescheduleError.set('That slot was just taken. Please choose another.');
            this.selectedSlotId.set('');
            this.loadRescheduleSlots(booking.stationId, this.selectedDateStr());
          } else if (code === 'TOO_LATE') {
            this.toastService.error(
              'Bookings cannot be rescheduled within 2 hours of the start time.',
              'Reschedule Closed'
            );
            this.isRescheduleModalOpen.set(false);
            this.loadBookings();
          } else if (
            code === 'INVALID_STATUS' ||
            code === 'BOOKING_NOT_FOUND' ||
            code === 'NOT_YOUR_BOOKING'
          ) {
            this.toastService.error(
              'This booking can no longer be rescheduled. Refreshing your bookings.',
              'Cannot Reschedule'
            );
            this.isRescheduleModalOpen.set(false);
            this.loadBookings();
          } else if (
            code === 'STATION_INACTIVE' ||
            code === 'GAME_INACTIVE' ||
            code === 'GAME_NOT_ON_STATION' ||
            code === 'GAME_NOT_FOUND'
          ) {
            this.rescheduleError.set(
              'This game or station is no longer available for rescheduling'
            );
          } else {
            this.rescheduleError.set(
              err.message || 'Failed to reschedule booking. Please check your connection and try again.'
            );
          }
        }
      });
  }

  // ── Mapping Helper ──────────────────────────────────────────────────────────

  private mapDisplayItem(raw: BookingResponse): BookingDisplayItem {
    const rawAny = raw as unknown as Record<string, unknown>;
    const stationCode = (rawAny['stationCode'] as string) || '';
    const stationName = raw.stationName || stationCode || 'PS5 Station';
    const gameTitle = raw.gameTitle || (raw.gameId ? `Game (${raw.gameId})` : 'PlayStation 5 Title');

    const totalAmount = Number(
      raw.finalAmount ?? rawAny['payableAmount'] ?? raw.totalAmount ?? 0
    );

    const now = Date.now();
    let startTimeMs = 0;
    let endTimeMs = 0;

    if (raw.startTime && raw.startTime.includes('T')) {
      startTimeMs = new Date(raw.startTime).getTime();
    } else if (raw.bookingDate && raw.startTime) {
      startTimeMs = new Date(`${raw.bookingDate}T${raw.startTime}:00+05:30`).getTime();
    }

    if (raw.endTime && raw.endTime.includes('T')) {
      endTimeMs = new Date(raw.endTime).getTime();
    } else if (raw.bookingDate && raw.endTime) {
      endTimeMs = new Date(`${raw.bookingDate}T${raw.endTime}:00+05:30`).getTime();
    }

    if (!startTimeMs) {
      startTimeMs = raw.createdAt ? new Date(raw.createdAt).getTime() : now;
    }
    if (!endTimeMs) {
      endTimeMs = startTimeMs + 2 * 3600 * 1000;
    }

    // Determine upcoming vs played
    const isCancelled = raw.status === 'CANCELLED';
    const isCompleted = raw.status === 'COMPLETED';
    const isUpcomingStatus = raw.status === 'CONFIRMED' || raw.status === 'PENDING';
    const isFuture = endTimeMs >= now;
    const isUpcoming = isUpcomingStatus && isFuture && !isCancelled && !isCompleted;

    // Rescheduling rules
    const isWithin2Hours = isWithinCutoffHours(startTimeMs, RESCHEDULE_CUTOFF_HOURS);
    const canReschedule = isUpcoming && raw.status === 'CONFIRMED';
    const durationHours = calculateDurationHours(raw.startTime, raw.endTime, raw.bookingDate);

    // Formatting date and time slot
    let formattedDate = raw.bookingDate || '';
    if (startTimeMs) {
      formattedDate = new Date(startTimeMs).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        timeZone: 'Asia/Colombo'
      });
    }

    let formattedTimeSlot = '';
    if (startTimeMs && endTimeMs) {
      const s = new Date(startTimeMs).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: 'Asia/Colombo'
      });
      const e = new Date(endTimeMs).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: 'Asia/Colombo'
      });
      formattedTimeSlot = `${s} – ${e}`;
    } else {
      formattedTimeSlot = `${raw.startTime || ''} – ${raw.endTime || ''}`;
    }

    return {
      ...raw,
      formattedDate,
      formattedTimeSlot,
      displayStation: stationName,
      displayGame: gameTitle,
      displayAmount: totalAmount,
      badgeVariant: this.resolveStatusVariant(raw.status),
      isUpcoming,
      sortTimestamp: startTimeMs,
      canReschedule,
      isWithin2Hours,
      durationHours
    };
  }

  resolveStatusVariant(status: BookingStatus): BadgeVariant {
    switch (status) {
      case 'CONFIRMED':
        return 'success';
      case 'PENDING':
        return 'warning';
      case 'CANCELLED':
        return 'danger';
      case 'COMPLETED':
        return 'primary';
      case 'IN_PROGRESS':
        return 'accent';
      default:
        return 'neutral';
    }
  }
}
