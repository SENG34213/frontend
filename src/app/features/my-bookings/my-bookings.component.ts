import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { BookingService } from '../../core/services/booking.service';
import { BookingResponse, BookingStatus } from '../../shared/models/booking.model';
import { CardComponent } from '../../shared/ui/card/card.component';
import { BadgeComponent, BadgeVariant } from '../../shared/ui/badge/badge.component';
import { TabsComponent, TabItem } from '../../shared/ui/tabs/tabs.component';
import { SkeletonComponent } from '../../shared/ui/skeleton/skeleton.component';
import { EmptyStateComponent } from '../../shared/ui/empty-state/empty-state.component';

export interface BookingDisplayItem extends BookingResponse {
  formattedDate: string;
  formattedTimeSlot: string;
  displayStation: string;
  displayGame: string;
  displayAmount: number;
  badgeVariant: BadgeVariant;
  isUpcoming: boolean;
  sortTimestamp: number;
}

@Component({
  selector: 'gc-my-bookings',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    CardComponent,
    BadgeComponent,
    TabsComponent,
    SkeletonComponent,
    EmptyStateComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './my-bookings.component.html',
  styleUrl: './my-bookings.component.scss'
})
export class MyBookingsComponent implements OnInit {
  private readonly bookingService = inject(BookingService);

  readonly allBookings = signal<BookingDisplayItem[]>([]);
  readonly activeTab = signal<'upcoming' | 'played'>('upcoming');
  readonly isLoading = signal<boolean>(true);
  readonly hasError = signal<boolean>(false);

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
  }

  onTabChange(tabId: string): void {
    if (tabId === 'upcoming' || tabId === 'played') {
      this.activeTab.set(tabId);
    }
  }

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
      startTimeMs = new Date(`${raw.bookingDate}T${raw.startTime}:00`).getTime();
    }

    if (raw.endTime && raw.endTime.includes('T')) {
      endTimeMs = new Date(raw.endTime).getTime();
    } else if (raw.bookingDate && raw.endTime) {
      endTimeMs = new Date(`${raw.bookingDate}T${raw.endTime}:00`).getTime();
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

    // Formatting date and time slot
    let formattedDate = raw.bookingDate || '';
    if (startTimeMs) {
      formattedDate = new Date(startTimeMs).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    }

    let formattedTimeSlot = '';
    if (startTimeMs && endTimeMs) {
      const s = new Date(startTimeMs).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
      const e = new Date(endTimeMs).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
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
      sortTimestamp: startTimeMs
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
