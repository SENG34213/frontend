import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  signal,
  computed,
  ChangeDetectionStrategy,
  ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, interval } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { TournamentService, TournamentViewItem } from '../../../core/services/tournament.service';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationSocketService } from '../../../core/services/notification-socket.service';
import { RegistrationResponse } from '../../../shared/models';

import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { BadgeComponent } from '../../../shared/ui/badge/badge.component';
import { ModalComponent } from '../../../shared/ui/modal/modal.component';
import { SkeletonComponent } from '../../../shared/ui/skeleton/skeleton.component';
import { EmptyStateComponent } from '../../../shared/ui/empty-state/empty-state.component';
import { ToastService } from '../../../shared/ui/toast/toast.service';

export type TournamentTab = 'all' | 'upcoming' | 'ongoing' | 'completed' | 'my-registrations';

@Component({
  selector: 'gc-tournaments-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ButtonComponent,
    BadgeComponent,
    ModalComponent,
    SkeletonComponent,
    EmptyStateComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './tournaments-list.component.html',
  styleUrl: './tournaments-list.component.scss'
})
export class TournamentsListComponent implements OnInit, OnDestroy {
  readonly tournamentService = inject(TournamentService);
  readonly authService = inject(AuthService);
  private readonly notifSocketService = inject(NotificationSocketService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroy$ = new Subject<void>();

  // ─── Signals ────────────────────────────────────────────────────────────────
  readonly tournaments = signal<TournamentViewItem[]>([]);
  readonly myRegistrations = signal<RegistrationResponse[]>([]);
  readonly isLoading = signal(true);
  readonly errorMessage = signal<string | null>(null);

  // Filters & State
  readonly activeTab = signal<TournamentTab>('all');
  readonly searchQuery = signal('');
  readonly selectedGame = signal('ALL');
  readonly sortBy = signal<'date_asc' | 'date_desc' | 'fee_asc' | 'fee_desc' | 'spots_asc'>('date_asc');

  // Countdown timer for hero tournament
  readonly heroCountdown = signal<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isPast: boolean;
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true });

  // Quick Register Modal
  readonly registerModalOpen = signal(false);
  readonly selectedTournamentForRegister = signal<TournamentViewItem | null>(null);
  readonly gamerTag = signal('');
  readonly isRegistering = signal(false);
  readonly registrationError = signal<string | null>(null);

  // ─── Computed Values ────────────────────────────────────────────────────────

  /**
   * Set of tournament IDs user is registered for.
   */
  readonly myRegisteredTournamentIds = computed<Set<string>>(() => {
    const set = new Set<string>();
    for (const reg of this.myRegistrations()) {
      if (reg.status !== 'CANCELLED') {
        set.add(reg.tournamentId);
      }
    }
    return set;
  });

  /**
   * Hero Featured Tournament: Next upcoming tournament with registration open.
   */
  readonly featuredTournament = computed<TournamentViewItem | null>(() => {
    const list = this.tournaments();
    if (!list.length) return null;

    // Pick first upcoming or ongoing tournament
    const candidate = list.find((t) => t.status === 'REGISTRATION_OPEN' || t.status === 'UPCOMING')
      || list.find((t) => t.status === 'ONGOING')
      || list[0];
    return candidate || null;
  });

  /**
   * Distinct list of games across tournaments for filtering dropdown.
   */
  readonly availableGames = computed<string[]>(() => {
    const set = new Set<string>();
    for (const t of this.tournaments()) {
      if (t.gameTitle) set.add(t.gameTitle);
    }
    return Array.from(set).sort();
  });

  /**
   * Filtered & sorted tournaments according to active tab, search, game, sort.
   */
  readonly filteredTournaments = computed<TournamentViewItem[]>(() => {
    const all = this.tournaments();
    const tab = this.activeTab();
    const query = this.searchQuery().trim().toLowerCase();
    const game = this.selectedGame();
    const sort = this.sortBy();
    const registeredIds = this.myRegisteredTournamentIds();

    let result = all.filter((t) => {
      // Tab filter
      if (tab === 'upcoming') {
        if (t.status !== 'UPCOMING' && t.status !== 'REGISTRATION_OPEN') return false;
      } else if (tab === 'ongoing') {
        if (t.status !== 'ONGOING' && t.status !== 'IN_PROGRESS') return false;
      } else if (tab === 'completed') {
        if (t.status !== 'COMPLETED' && t.status !== 'CANCELLED') return false;
      } else if (tab === 'my-registrations') {
        if (!registeredIds.has(t.id)) return false;
      }

      // Search query
      if (query) {
        const matchesName = t.name.toLowerCase().includes(query);
        const matchesGame = t.gameTitle?.toLowerCase().includes(query) ?? false;
        if (!matchesName && !matchesGame) return false;
      }

      // Game filter
      if (game !== 'ALL') {
        if (t.gameTitle !== game) return false;
      }

      return true;
    });

    // Sort
    result = [...result].sort((a, b) => {
      const timeA = new Date(a.startDate).getTime() || 0;
      const timeB = new Date(b.startDate).getTime() || 0;

      switch (sort) {
        case 'date_asc':
          return timeA - timeB;
        case 'date_desc':
          return timeB - timeA;
        case 'fee_asc':
          return (a.entryFee || 0) - (b.entryFee || 0);
        case 'fee_desc':
          return (b.entryFee || 0) - (a.entryFee || 0);
        case 'spots_asc':
          return a.spotsLeft - b.spotsLeft;
        default:
          return 0;
      }
    });

    return result;
  });

  // ─── Lifecycle ─────────────────────────────────────────────────────────────

  ngOnInit(): void {
    // Read optional tab query param
    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      if (params['tab'] && ['all', 'upcoming', 'ongoing', 'completed', 'my-registrations'].includes(params['tab'])) {
        this.activeTab.set(params['tab'] as TournamentTab);
      }
    });

    this.loadData();
    this.startCountdownTimer();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ─── Data Loading ──────────────────────────────────────────────────────────

  loadData(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.tournamentService.getTournaments().subscribe({
      next: (list) => {
        this.tournaments.set(list);
        this.isLoading.set(false);
        this.updateHeroCountdown();
        this.cdr.markForCheck();
      },
      error: () => {
        this.errorMessage.set('Could not load tournaments. Please check your connection and try again.');
        this.isLoading.set(false);
        this.cdr.markForCheck();
      }
    });

    // Load user registrations if signed in
    if (this.authService.isAuthenticated()) {
      this.tournamentService.getMyRegistrations().subscribe({
        next: (regs) => {
          this.myRegistrations.set(regs);
          this.cdr.markForCheck();
        },
        error: () => {
          // Non-blocking
        }
      });
    }
  }

  private startCountdownTimer(): void {
    interval(1000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.updateHeroCountdown();
      });
  }

  private updateHeroCountdown(): void {
    const featured = this.featuredTournament();
    if (featured) {
      this.heroCountdown.set(this.tournamentService.calculateCountdown(featured.startDate));
    }
  }

  // ─── User Actions ──────────────────────────────────────────────────────────

  setTab(tab: TournamentTab): void {
    this.activeTab.set(tab);
  }

  onResetFilters(): void {
    if (this.activeTab() === 'my-registrations') {
      this.setTab('all');
    } else {
      this.searchQuery.set('');
      this.selectedGame.set('ALL');
    }
  }

  onSearchChange(val: string): void {
    this.searchQuery.set(val);
  }

  viewDetails(tournamentId: string): void {
    this.router.navigate(['/tournaments', tournamentId]);
  }

  viewBracket(tournamentId: string): void {
    this.router.navigate(['/tournaments', tournamentId, 'bracket']);
  }

  openRegisterModal(tournament: TournamentViewItem): void {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login'], { queryParams: { returnUrl: `/tournaments/${tournament.id}` } });
      return;
    }

    if (tournament.isFull) {
      this.toast.error('This tournament has reached maximum player capacity.');
      return;
    }

    this.selectedTournamentForRegister.set(tournament);
    this.gamerTag.set(this.authService.currentUser()?.fullName || '');
    this.registrationError.set(null);
    this.registerModalOpen.set(true);
  }

  closeRegisterModal(): void {
    this.registerModalOpen.set(false);
    this.selectedTournamentForRegister.set(null);
    this.gamerTag.set('');
    this.registrationError.set(null);
  }

  submitRegistration(): void {
    const tournament = this.selectedTournamentForRegister();
    if (!tournament) return;

    const tag = this.gamerTag().trim();
    if (!tag) {
      this.registrationError.set('Please enter your Gamer Tag or In-Game Name.');
      return;
    }

    this.isRegistering.set(true);
    this.registrationError.set(null);

    this.tournamentService.registerForTournament(tournament.id, tag).subscribe({
      next: (res) => {
        this.isRegistering.set(false);
        this.closeRegisterModal();
        this.toast.success(`Successfully registered for ${tournament.name}! Entry fee confirmed.`);
        
        // Emit real-time notification
        this.notifSocketService.sendNotification({
          type: 'TOURNAMENT_REGISTRATION',
          category: 'TOURNAMENT',
          title: 'Tournament Registration Confirmed 🏆',
          message: `Successfully enrolled in ${tournament.name} (${tag}). Check bracket for matchups!`,
          referenceId: res.id,
          link: `/tournaments/${tournament.id}`
        });

        // Update local state
        this.myRegistrations.update((regs) => [...regs, res]);
        this.tournaments.update((list) =>
          list.map((t) => {
            if (t.id === tournament.id) {
              const newCount = (t.participantCount || 0) + 1;
              return this.tournamentService.enrichTournament({
                ...t,
                participantCount: newCount
              });
            }
            return t;
          })
        );
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.isRegistering.set(false);
        if (err?.status === 402) {
          this.registrationError.set('Payment could not be processed for the entry fee. Please verify your account balance.');
        } else if (err?.status === 409 || err?.message?.includes('already registered')) {
          this.registrationError.set('You are already registered for this tournament.');
        } else if (err?.status === 400 || err?.error?.message) {
          this.registrationError.set(err.error.message);
        } else {
          this.registrationError.set('Registration failed due to a server error. Please try again.');
        }
        this.cdr.markForCheck();
      }
    });
  }

  isUserRegistered(tournamentId: string): boolean {
    return this.myRegisteredTournamentIds().has(tournamentId);
  }

  formatDate(isoDate: string): string {
    if (!isoDate) return 'TBA';
    const date = new Date(isoDate);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
