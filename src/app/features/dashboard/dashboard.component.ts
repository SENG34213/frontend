import {
  Component,
  OnInit,
  inject,
  signal,
  computed,
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
import { ToastService } from '../../shared/ui/toast/toast.service';
import { Game, BookingReview } from '../../shared/models';

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
  private readonly toastService = inject(ToastService, { optional: true });

  readonly featuredGames = signal<Game[]>([]);
  readonly featuredLoading = signal(true);
  readonly featuredOffset = signal(0);
  readonly featuredVisible = 3; // cards shown at once

  readonly currentEvent = signal<TournamentViewItem | null>(null);
  readonly currentEventLoading = signal<boolean>(true);
  readonly upcomingTournaments = signal<TournamentViewItem[]>([]);

  // ─── Reviews & Ratings Signals ──────────────────────────────────────────────
  readonly reviews = signal<BookingReview[]>([]);
  readonly reviewsLoading = signal<boolean>(true);
  readonly selectedStarFilter = signal<number | null>(null);
  readonly selectedGameFilter = signal<string>('ALL');
  readonly helpfulVotes = signal<Record<string, number>>({});
  readonly userVotedReviews = signal<Set<string>>(new Set());

  readonly fallbackTournaments: TournamentViewItem[] = [
    {
      id: 'tourney-fc25',
      name: 'EA Sports FC 25 Northern Cup',
      gameTitle: 'EA Sports FC 25',
      startDate: new Date(Date.now() + 86400000 * 3).toISOString(),
      endDate: new Date(Date.now() + 86400000 * 3 + 14400000).toISOString(),
      registrationDeadline: new Date(Date.now() + 86400000 * 2).toISOString(),
      entryFee: 1500,
      maxParticipants: 16,
      participantCount: 10,
      spotsLeft: 6,
      progressPercent: 62,
      isFull: false,
      isClosingSoon: false,
      status: 'REGISTRATION_OPEN',
      isRegistrationOpen: true,
      createdByAdminId: '00000000-0000-0000-0000-000000000001',
      createdAt: new Date().toISOString()
    },
    {
      id: 'tourney-tekken8',
      name: 'Tekken 8 Iron Fist Jaffna',
      gameTitle: 'Tekken 8',
      startDate: new Date(Date.now() + 86400000 * 5).toISOString(),
      endDate: new Date(Date.now() + 86400000 * 5 + 18000000).toISOString(),
      registrationDeadline: new Date(Date.now() + 86400000 * 4).toISOString(),
      entryFee: 1000,
      maxParticipants: 16,
      participantCount: 12,
      spotsLeft: 4,
      progressPercent: 75,
      isFull: false,
      isClosingSoon: true,
      status: 'REGISTRATION_OPEN',
      isRegistrationOpen: true,
      createdByAdminId: '00000000-0000-0000-0000-000000000001',
      createdAt: new Date().toISOString()
    },
    {
      id: 'tourney-mk1',
      name: 'Mortal Kombat 1 Showdown',
      gameTitle: 'Mortal Kombat 1',
      startDate: new Date(Date.now() + 86400000 * 7).toISOString(),
      endDate: new Date(Date.now() + 86400000 * 7 + 14400000).toISOString(),
      registrationDeadline: new Date(Date.now() + 86400000 * 6).toISOString(),
      entryFee: 0,
      maxParticipants: 8,
      participantCount: 5,
      spotsLeft: 3,
      progressPercent: 62,
      isFull: false,
      isClosingSoon: false,
      status: 'UPCOMING',
      isRegistrationOpen: true,
      createdByAdminId: '00000000-0000-0000-0000-000000000001',
      createdAt: new Date().toISOString()
    }
  ];

  readonly displayTournaments = computed(() => {
    const list = this.upcomingTournaments();
    return list.length > 0 ? list : this.fallbackTournaments;
  });

  // ─── Reviews Computations ──────────────────────────────────────────────────
  readonly averageRating = computed(() => {
    const list = this.reviews();
    if (!list || list.length === 0) return 4.9;
    const sum = list.reduce((acc, r) => acc + (r.rating || 5), 0);
    const avg = sum / list.length;
    return Number(avg.toFixed(1));
  });

  readonly totalReviewCount = computed(() => {
    const list = this.reviews();
    return list.length > 0 ? list.length : 148;
  });

  readonly recommendationPercent = computed(() => {
    const list = this.reviews();
    if (!list || list.length === 0) return 98;
    const positive = list.filter((r) => r.rating >= 4).length;
    return Math.round((positive / list.length) * 100);
  });

  readonly starBreakdown = computed(() => {
    const list = this.reviews();
    const total = list.length || 1;
    const counts: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    for (const r of list) {
      const star = Math.min(5, Math.max(1, Math.round(r.rating || 5)));
      counts[star] = (counts[star] || 0) + 1;
    }
    return [5, 4, 3, 2, 1].map((stars) => {
      const count = counts[stars] || 0;
      const percent = Math.round((count / total) * 100);
      return { stars, count, percent };
    });
  });

  readonly availableGameFilters = computed(() => {
    const set = new Set<string>();
    for (const r of this.reviews()) {
      if (r.gameTitle) set.add(r.gameTitle);
    }
    return Array.from(set);
  });

  readonly filteredReviews = computed(() => {
    let list = this.reviews();
    const starFilter = this.selectedStarFilter();
    const gameFilter = this.selectedGameFilter();

    if (starFilter !== null) {
      list = list.filter((r) => Math.round(r.rating) === starFilter);
    }

    if (gameFilter && gameFilter !== 'ALL') {
      list = list.filter((r) => r.gameTitle?.toLowerCase().includes(gameFilter.toLowerCase()));
    }

    return list;
  });

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
    this.loadReviews();
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
          const activeTournaments = tournaments.filter((t) => t.status !== 'CANCELLED');
          const showcase = activeTournaments.length > 0 ? activeTournaments : tournaments;
          this.upcomingTournaments.set(showcase.slice(0, 3));
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
          this.upcomingTournaments.set([]);
          this.currentEvent.set(null);
        }
        this.currentEventLoading.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.upcomingTournaments.set([]);
        this.currentEvent.set(null);
        this.currentEventLoading.set(false);
        this.cdr.markForCheck();
      }
    });
  }

  private loadReviews(): void {
    this.reviewsLoading.set(true);
    this.bookingService.getRecentReviews().subscribe({
      next: (revs) => {
        this.reviews.set(revs);
        this.reviewsLoading.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.reviewsLoading.set(false);
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

  get isAuthenticated(): boolean {
    if (typeof this.authService?.isAuthenticated === 'function') {
      return this.authService.isAuthenticated();
    }
    return !!this.authService?.currentUser();
  }

  onEventClick(event?: TournamentViewItem | null): void {
    const target = event?.id ? `/tournaments/${event.id}` : '/tournaments';
    if (!this.isAuthenticated) {
      this.toastService?.info('Please sign in to view tournament details.', 'Sign In Required');
      this.router.navigate(['/login'], { queryParams: { returnUrl: target } });
      return;
    }
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

  // ─── Reviews Interactive Helpers ──────────────────────────────────────────

  setStarFilter(stars: number | null): void {
    this.selectedStarFilter.set(stars);
  }

  setGameFilter(game: string): void {
    this.selectedGameFilter.set(game);
  }

  toggleHelpful(reviewId: string): void {
    const voted = new Set(this.userVotedReviews());
    const votes = { ...this.helpfulVotes() };

    if (voted.has(reviewId)) {
      voted.delete(reviewId);
      votes[reviewId] = Math.max(0, (votes[reviewId] || 1) - 1);
      this.toastService?.info('Helpful vote removed.', 'Review Feedback');
    } else {
      voted.add(reviewId);
      votes[reviewId] = (votes[reviewId] || 0) + 1;
      this.toastService?.success('Thank you for your feedback!', 'Marked as Helpful');
    }

    this.userVotedReviews.set(voted);
    this.helpfulVotes.set(votes);
  }

  getHelpfulCount(review: BookingReview): number {
    const extra = this.helpfulVotes()[review.id] || 0;
    return (review.helpfulCount || 0) + extra;
  }

  hasUserVoted(reviewId: string): boolean {
    return this.userVotedReviews().has(reviewId);
  }

  formatReviewDate(isoString: string): string {
    if (!isoString) return 'Recently';
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return 'Recently';
    const diffMs = Date.now() - date.getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)}w ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  getInitials(name?: string): string {
    if (!name) return 'GC';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  // ─── Navigation helpers ───────────────────────────────────────────────────

  bookSlot(): void {
    if (!this.isAuthenticated) {
      this.toastService?.info('Please sign in to book your gaming station.', 'Sign In Required');
      this.router.navigate(['/login'], { queryParams: { returnUrl: '/bookings' } });
      return;
    }
    this.router.navigate(['/bookings']);
  }

  joinTournament(): void {
    if (!this.isAuthenticated) {
      this.toastService?.info('Please sign in to view and join tournaments.', 'Sign In Required');
      this.router.navigate(['/login'], { queryParams: { returnUrl: '/tournaments' } });
      return;
    }
    this.router.navigate(['/tournaments']);
  }

  onFeaturedGameClick(game: Game): void {
    const target = `/bookings?gameId=${game.id}`;
    if (!this.isAuthenticated) {
      this.toastService?.info(`Please sign in to book a session for ${game.title}.`, 'Sign In Required');
      this.router.navigate(['/login'], { queryParams: { returnUrl: target } });
      return;
    }
    this.router.navigate(['/bookings'], { queryParams: { gameId: game.id } });
  }

  onGameSelected(event: { stationId: string; gameId: string }): void {
    const target = `/bookings?stationId=${event.stationId}&gameId=${event.gameId}`;
    if (!this.isAuthenticated) {
      this.toastService?.info('Please sign in to reserve this station and game.', 'Sign In Required');
      this.router.navigate(['/login'], { queryParams: { returnUrl: target } });
      return;
    }
    this.router.navigate(['/bookings'], {
      queryParams: { stationId: event.stationId, gameId: event.gameId }
    });
  }

  onStationBookClicked(stationId: string): void {
    const target = `/bookings?stationId=${stationId}`;
    if (!this.isAuthenticated) {
      this.toastService?.info('Please sign in to book this gaming station.', 'Sign In Required');
      this.router.navigate(['/login'], { queryParams: { returnUrl: target } });
      return;
    }
    this.router.navigate(['/bookings'], { queryParams: { stationId } });
  }

  onTournamentClick(tournament: TournamentViewItem): void {
    const target = `/tournaments/${tournament.id}`;
    if (!this.isAuthenticated) {
      this.toastService?.info('Please sign in to view tournament details and register.', 'Sign In Required');
      this.router.navigate(['/login'], { queryParams: { returnUrl: target } });
      return;
    }
    this.router.navigate(['/tournaments', tournament.id]);
  }

  viewAllTournaments(): void {
    if (!this.isAuthenticated) {
      this.toastService?.info('Please sign in to view all tournaments and compete.', 'Sign In Required');
      this.router.navigate(['/login'], { queryParams: { returnUrl: '/tournaments' } });
      return;
    }
    this.router.navigate(['/tournaments']);
  }

  formatTourneyDate(isoString: string): string {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return '';
    try {
      const weekday = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Colombo', weekday: 'short' }).format(date);
      const day = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Colombo', day: 'numeric' }).format(date);
      const month = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Colombo', month: 'short' }).format(date);
      const time = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Colombo', hour: 'numeric', minute: '2-digit', hour12: true }).format(date);
      return `${weekday} ${day} ${month} · ${time}`;
    } catch {
      return date.toLocaleDateString();
    }
  }

  formatTourneyFee(amount: number): string {
    if (!amount || amount === 0) return 'FREE ENTRY';
    return `LKR ${Number(amount).toLocaleString('en-US')}`;
  }

  onSubscribeAlerts(inputEl: HTMLInputElement): void {
    const email = (inputEl.value || '').trim();
    if (!email || !email.includes('@')) {
      this.toastService?.warning('Please enter a valid email address.', 'Invalid Email');
      return;
    }
    this.toastService?.success('You are subscribed to tournament alerts!', 'Subscribed');
    inputEl.value = '';
  }
}
