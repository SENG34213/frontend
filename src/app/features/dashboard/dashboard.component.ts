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
import { ButtonComponent } from '../../shared/ui/button/button.component';
import { BadgeComponent } from '../../shared/ui/badge/badge.component';
import { SkeletonComponent } from '../../shared/ui/skeleton/skeleton.component';
import { StationGamePickerComponent } from '../../shared/components/station-game-picker/station-game-picker.component';
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
    StationGamePickerComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
  readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly bookingService = inject(BookingService);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly featuredGames = signal<Game[]>([]);
  readonly featuredLoading = signal(true);
  readonly featuredOffset = signal(0);
  readonly featuredVisible = 3; // cards shown at once

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
