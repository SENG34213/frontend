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
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, interval } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { TournamentService, TournamentViewItem } from '../../../core/services/tournament.service';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationSocketService } from '../../../core/services/notification-socket.service';
import { RegistrationResponse, BracketResponse } from '../../../shared/models';

import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { BadgeComponent } from '../../../shared/ui/badge/badge.component';
import { SkeletonComponent } from '../../../shared/ui/skeleton/skeleton.component';
import { ToastService } from '../../../shared/ui/toast/toast.service';

@Component({
  selector: 'gc-tournament-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ButtonComponent,
    BadgeComponent,
    SkeletonComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './tournament-detail.component.html',
  styleUrl: './tournament-detail.component.scss'
})
export class TournamentDetailComponent implements OnInit, OnDestroy {
  readonly tournamentService = inject(TournamentService);
  readonly authService = inject(AuthService);
  private readonly notifSocketService = inject(NotificationSocketService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroy$ = new Subject<void>();

  // ─── Signals ────────────────────────────────────────────────────────────────
  readonly tournamentId = signal<string>('');
  readonly tournament = signal<TournamentViewItem | null>(null);
  readonly userRegistration = signal<RegistrationResponse | null>(null);
  readonly bracket = signal<BracketResponse | null>(null);

  readonly isLoading = signal(true);
  readonly errorMessage = signal<string | null>(null);

  // Registration Form State
  readonly gamerTag = signal('');
  readonly agreedToRules = signal(false);
  readonly isRegistering = signal(false);
  readonly registrationError = signal<string | null>(null);
  readonly registrationSuccess = signal(false);

  // Active view tab: 'overview' | 'bracket' | 'rules'
  readonly activeTab = signal<'overview' | 'bracket' | 'rules'>('overview');

  // Live countdown to start date
  readonly countdown = signal<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isPast: boolean;
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true });

  // ─── Computed Values ────────────────────────────────────────────────────────

  readonly isRegistered = computed<boolean>(() => {
    return this.userRegistration() !== null && this.userRegistration()?.status !== 'CANCELLED';
  });

  readonly canRegister = computed<boolean>(() => {
    const t = this.tournament();
    if (!t) return false;
    return (
      !this.isRegistered() &&
      (t.isRegistrationOpen ?? true) &&
      !t.isFull &&
      t.status !== 'CANCELLED' &&
      t.status !== 'COMPLETED'
    );
  });

  // ─── Lifecycle ─────────────────────────────────────────────────────────────

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') || '';
    this.tournamentId.set(id);

    if (id) {
      this.loadTournament(id);
    } else {
      this.errorMessage.set('Invalid tournament identifier.');
      this.isLoading.set(false);
    }

    // Tick countdown timer every 1s
    interval(1000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        const t = this.tournament();
        if (t) {
          this.countdown.set(this.tournamentService.calculateCountdown(t.startDate));
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ─── Data Fetching ─────────────────────────────────────────────────────────

  loadTournament(id: string): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.tournamentService.getTournamentById(id).subscribe({
      next: (t) => {
        this.tournament.set(t);
        this.countdown.set(this.tournamentService.calculateCountdown(t.startDate));
        this.gamerTag.set(this.authService.currentUser()?.fullName || '');
        this.isLoading.set(false);
        this.cdr.markForCheck();

        // Check if user is registered
        if (this.authService.isAuthenticated()) {
          this.checkUserRegistration(id);
        }

        // Fetch bracket
        this.loadBracket(id);
      },
      error: () => {
        this.errorMessage.set('Failed to load tournament information. Please try again.');
        this.isLoading.set(false);
        this.cdr.markForCheck();
      }
    });
  }

  private checkUserRegistration(tournamentId: string): void {
    this.tournamentService.getMyRegistrations().subscribe({
      next: (regs) => {
        const match = regs.find((r) => r.tournamentId === tournamentId && r.status !== 'CANCELLED');
        if (match) {
          this.userRegistration.set(match);
          this.cdr.markForCheck();
        }
      },
      error: () => {
        // Non-blocking
      }
    });
  }

  private loadBracket(tournamentId: string): void {
    this.tournamentService.getBracket(tournamentId).subscribe({
      next: (b) => {
        this.bracket.set(b);
        this.cdr.markForCheck();
      },
      error: () => {
        // Non-blocking (bracket might not be generated yet)
      }
    });
  }

  // ─── Registration Flow ─────────────────────────────────────────────────────

  submitRegistration(): void {
    const t = this.tournament();
    if (!t) return;

    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login'], { queryParams: { returnUrl: `/tournaments/${t.id}` } });
      return;
    }

    const tag = this.gamerTag().trim();
    if (!tag) {
      this.registrationError.set('Please enter your Gamer Tag or In-Game Name.');
      return;
    }

    if (!this.agreedToRules()) {
      this.registrationError.set('Please accept the tournament rules and fair play guidelines.');
      return;
    }

    this.isRegistering.set(true);
    this.registrationError.set(null);

    this.tournamentService.registerForTournament(t.id, tag).subscribe({
      next: (res) => {
        this.isRegistering.set(false);
        this.userRegistration.set(res);
        this.registrationSuccess.set(true);
        this.toast.success(`Registration Confirmed! Welcome to the ${t.name}.`);

        // Emit real-time notification
        this.notifSocketService.sendNotification({
          type: 'TOURNAMENT_REGISTRATION',
          category: 'TOURNAMENT',
          title: 'Tournament Enrolled! 🏆',
          message: `You've registered for ${t.name} as "${tag}". Check bracket for matchups!`,
          referenceId: res.id,
          link: `/tournaments/${t.id}/bracket`,
          targetUserId: (typeof this.authService.getUserId === 'function' ? this.authService.getUserId() : this.authService.currentUser()?.userId) || undefined,
          data: { tournamentId: t.id, gamerTag: tag }
        });

        // Increment count locally
        this.tournament.update((curr) => {
          if (!curr) return null;
          return this.tournamentService.enrichTournament({
            ...curr,
            participantCount: (curr.participantCount || 0) + 1
          });
        });
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.isRegistering.set(false);
        if (err?.status === 402) {
          this.registrationError.set('Payment could not be processed for the entry fee. Please check your balance or payment method.');
        } else if (err?.status === 409 || err?.message?.includes('already registered')) {
          this.registrationError.set('You are already registered for this tournament.');
        } else if (err?.error?.message) {
          this.registrationError.set(err.error.message);
        } else {
          this.registrationError.set('Unable to complete registration. Please try again or contact customer support.');
        }
        this.cdr.markForCheck();
      }
    });
  }

  // ─── Navigation & Helpers ──────────────────────────────────────────────────

  goBack(): void {
    this.router.navigate(['/tournaments']);
  }

  goToBracket(): void {
    const id = this.tournamentId();
    if (id) {
      this.router.navigate(['/tournaments', id, 'bracket']);
    }
  }

  formatDate(isoDate?: string): string {
    if (!isoDate) return 'TBA';
    const date = new Date(isoDate);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
