import {
  Component,
  OnInit,
  inject,
  signal,
  ChangeDetectionStrategy,
  ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { BookingService } from '../../core/services/booking.service';
import { TournamentService, TournamentViewItem } from '../../core/services/tournament.service';
import { ButtonComponent } from '../../shared/ui/button/button.component';
import { BadgeComponent } from '../../shared/ui/badge/badge.component';
import { SkeletonComponent } from '../../shared/ui/skeleton/skeleton.component';
import { StationGamePickerComponent } from '../../shared/components/station-game-picker/station-game-picker.component';
import { TournamentTickerComponent } from '../../shared/components/tournament-ticker/tournament-ticker.component';
import { Game } from '../../shared/models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ButtonComponent,
    BadgeComponent,
    SkeletonComponent,
    StationGamePickerComponent,
    TournamentTickerComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
  readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly bookingService = inject(BookingService);
  private readonly tournamentService = inject(TournamentService);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly featuredGames = signal<Game[]>([]);
  readonly featuredLoading = signal(true);
  readonly featuredOffset = signal(0);
  readonly featuredVisible = 3; // cards shown at once

  readonly currentEvent = signal<TournamentViewItem | null>(null);
  readonly currentEventLoading = signal<boolean>(true);

  readonly whyItems = [
    {
      icon: '⚡',
      title: 'HIGH-SPEED INTERNET',
      description: 'Zero lag, sub-10ms ping on global servers. Dedicated fiber ensures no latency spikes.',
      accent: false
    },
    {
      icon: '👥',
      title: 'COMMUNITY EVENTS',
      description: 'Weekly tournaments and local rankings, including the Elite Jaffna Leaderboard.',
      accent: true
    },
    {
      icon: '🪑',
      title: 'PREMIUM COMFORT',
      description: 'Pro-gaming chairs and climate-controlled environment for marathon sessions.',
      accent: false
    },
    {
      icon: '🎮',
      title: 'NEXT-GEN GEAR',
      description: 'PS5 Pro-enabled consoles, 144Hz 4K displays, and 3D Audio headsets at every station.',
      accent: false
    }
  ];

  ngOnInit(): void {
    this.loadFeaturedGames();
    this.loadCurrentEvent();
  }

  private loadFeaturedGames(): void {
    this.featuredLoading.set(true);
    this.bookingService.getGames({ featured: true }).subscribe({
      next: (games) => {
        this.featuredGames.set(games.filter((g) => g.featured !== false).slice(0, 10));
        this.featuredLoading.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.featuredLoading.set(false);
        this.cdr.markForCheck();
      }
    });
  }

  loadCurrentEvent(): void {
    this.currentEventLoading.set(true);
    this.tournamentService.getTournaments().subscribe({
      next: (tournaments) => {
        if (tournaments && tournaments.length > 0) {
          // 1. Look for live/ongoing tournament
          const ongoing = tournaments.find(
            (t) => t.status === 'ONGOING' || t.status === 'IN_PROGRESS'
          );
          if (ongoing) {
            this.currentEvent.set(ongoing);
          } else {
            // 2. Pick nearest upcoming tournament
            const now = Date.now();
            const upcoming = tournaments
              .filter((t) => {
                const isUpcomingStatus = t.status === 'UPCOMING' || t.status === 'REGISTRATION_OPEN';
                const start = new Date(t.startDate).getTime();
                return isUpcomingStatus && (!isNaN(start) ? start >= now : true);
              })
              .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

            this.currentEvent.set(upcoming[0] || tournaments[0]);
          }
        } else {
          this.currentEvent.set(null);
        }
        this.currentEventLoading.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.currentEvent.set(null);
        this.currentEventLoading.set(false);
        this.cdr.markForCheck();
      }
    });
  }

  getEventTimeDisplay(event: TournamentViewItem): string {
    if (event.status === 'ONGOING' || event.status === 'IN_PROGRESS') {
      return 'Live Now • In Progress';
    }
    return this.formatEventDate(event.startDate);
  }

  private formatEventDate(isoString?: string): string {
    if (!isoString) return 'Starts Saturday, 4PM';
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return 'Starts soon';

    try {
      const weekday = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Colombo', weekday: 'short' }).format(date);
      const day = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Colombo', day: 'numeric' }).format(date);
      const month = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Colombo', month: 'short' }).format(date);
      const time = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Colombo', hour: 'numeric', minute: '2-digit', hour12: true }).format(date);
      return `Starts ${weekday} ${day} ${month}, ${time}`;
    } catch {
      return `Starts ${date.toLocaleDateString()}`;
    }
  }

  onEventClick(event?: TournamentViewItem | null): void {
    if (event?.id) {
      this.router.navigate(['/tournaments', event.id]);
    } else {
      this.router.navigate(['/tournaments']);
    }
  }

  // ─── Featured carousel ────────────────────────────────────────────────────

  get visibleFeaturedGames(): Game[] {
    return this.featuredGames().slice(this.featuredOffset(), this.featuredOffset() + this.featuredVisible);
  }

  prevFeatured(): void {
    this.featuredOffset.update((o) => Math.max(0, o - 1));
  }

  nextFeatured(): void {
    this.featuredOffset.update((o) =>
      Math.min(this.featuredGames().length - this.featuredVisible, o + 1)
    );
  }

  canPrevFeatured(): boolean {
    return this.featuredOffset() > 0;
  }

  canNextFeatured(): boolean {
    return this.featuredOffset() + this.featuredVisible < this.featuredGames().length;
  }

  // ─── Navigation helpers ───────────────────────────────────────────────────

  bookSlot(): void {
    this.router.navigate(['/bookings']);
  }

  joinTournament(): void {
    this.router.navigate(['/tournaments']);
  }

  onFeaturedGameClick(game: Game): void {
    // Navigate with gameId; bookings page will show stations that have this game
    this.router.navigate(['/bookings'], { queryParams: { gameId: game.id } });
  }

  onGameSelected(event: { stationId: string; gameId: string }): void {
    this.router.navigate(['/bookings'], {
      queryParams: { stationId: event.stationId, gameId: event.gameId }
    });
  }
}
