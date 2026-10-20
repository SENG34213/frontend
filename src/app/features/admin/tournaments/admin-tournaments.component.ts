import {
  Component, OnInit, OnDestroy, signal, computed, inject, ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Subject, takeUntil, catchError, switchMap, of, map } from 'rxjs';

import { TournamentAdminService } from './tournament-admin.service';
import {
  TournamentResponse,
  TournamentRequest,
  TournamentStatus,
  RegistrationResponse,
  BracketResponse,
  MatchResponse
} from '../../../shared/models';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { NotificationSocketService } from '../../../core/services/notification-socket.service';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { CardComponent } from '../../../shared/ui/card/card.component';
import { BadgeComponent } from '../../../shared/ui/badge/badge.component';
import { ModalComponent } from '../../../shared/ui/modal/modal.component';
import { SkeletonComponent } from '../../../shared/ui/skeleton/skeleton.component';
import { EmptyStateComponent } from '../../../shared/ui/empty-state/empty-state.component';
import { ImageUploaderComponent } from '../../../shared/components/image-uploader/image-uploader.component';

@Component({
  selector: 'gc-admin-tournaments',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    ButtonComponent,
    CardComponent,
    BadgeComponent,
    ModalComponent,
    SkeletonComponent,
    EmptyStateComponent,
    ImageUploaderComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-tournaments.component.html',
  styleUrl: './admin-tournaments.component.scss'
})
export class AdminTournamentsComponent implements OnInit, OnDestroy {
  private readonly tournamentAdminService = inject(TournamentAdminService);
  private readonly notifSocketService = inject(NotificationSocketService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroy$ = new Subject<void>();

  // ── Signals ────────────────────────────────────────────────────────────────
  readonly tournaments = signal<TournamentResponse[]>([]);
  readonly isLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly actionInFlight = signal(false);

  // Filters
  readonly searchQuery = signal('');
  readonly filterStatus = signal<string>('');
  readonly sortBy = signal<'date_asc' | 'date_desc' | 'fee_asc' | 'fee_desc'>('date_asc');

  // Create Modal
  readonly createModalOpen = signal(false);

  // Edit Modal
  readonly editModalOpen = signal(false);
  readonly selectedTournamentForEdit = signal<TournamentResponse | null>(null);

  // Registrations Inspector Modal
  readonly registrationsModalOpen = signal(false);
  readonly selectedTournamentForRegistrations = signal<TournamentResponse | null>(null);
  readonly registrationsList = signal<RegistrationResponse[]>([]);
  readonly isRegistrationsLoading = signal(false);

  // Bracket Inspector Modal
  readonly bracketModalOpen = signal(false);
  readonly selectedTournamentForBracket = signal<TournamentResponse | null>(null);
  readonly activeBracket = signal<BracketResponse | null>(null);
  readonly isBracketLoading = signal(false);

  // Status Modal
  readonly statusModalOpen = signal(false);
  readonly selectedTournamentForStatus = signal<TournamentResponse | null>(null);

  // Cancel Modal
  readonly cancelModalOpen = signal(false);
  readonly selectedTournamentForCancel = signal<TournamentResponse | null>(null);

  // ── Reactive Forms ─────────────────────────────────────────────────────────
  readonly createForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
    gameTitle: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(60)]],
    imageUrl: [''],
    startDate: [this.toLocalDatetimeStr(new Date(Date.now() + 7 * 86400000)), [Validators.required]],
    endDate: [this.toLocalDatetimeStr(new Date(Date.now() + 8 * 86400000))],
    entryFee: [1500, [Validators.required, Validators.min(0)]],
    maxParticipants: [16, [Validators.required, Validators.min(2)]],
    registrationDeadline: [this.toLocalDatetimeStr(new Date(Date.now() + 5 * 86400000)), [Validators.required]]
  });

  readonly editForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
    gameTitle: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(60)]],
    imageUrl: [''],
    startDate: ['', [Validators.required]],
    endDate: [''],
    entryFee: [1500, [Validators.required, Validators.min(0)]],
    maxParticipants: [16, [Validators.required, Validators.min(2)]],
    registrationDeadline: ['', [Validators.required]]
  });

  readonly statusForm = this.fb.group({
    status: ['REGISTRATION_OPEN' as TournamentStatus, [Validators.required]]
  });

  // ── Options ────────────────────────────────────────────────────────────────
  readonly statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'REGISTRATION_OPEN', label: 'Registration Open' },
    { value: 'ONGOING', label: 'Ongoing / Live' },
    { value: 'UPCOMING', label: 'Upcoming' },
    { value: 'COMPLETED', label: 'Completed' },
    { value: 'CANCELLED', label: 'Cancelled' }
  ];

  readonly sortOptions = [
    { value: 'date_asc', label: 'Start Date (Earliest First)' },
    { value: 'date_desc', label: 'Start Date (Latest First)' },
    { value: 'fee_asc', label: 'Entry Fee (Low to High)' },
    { value: 'fee_desc', label: 'Entry Fee (High to Low)' }
  ];

  // ── Computed Metrics & Filtered Data ───────────────────────────────────────
  readonly totalTournaments = computed(() => this.tournaments().length);
  readonly ongoingCount = computed(() =>
    this.tournaments().filter((t) => t.status === 'ONGOING' || t.status === 'IN_PROGRESS').length
  );
  readonly openRegistrationCount = computed(() =>
    this.tournaments().filter((t) => t.status === 'REGISTRATION_OPEN').length
  );
  readonly totalEnrolledPlayers = computed(() =>
    this.tournaments().reduce((sum, t) => sum + (t.participantCount ?? t.currentParticipants ?? 0), 0)
  );

  readonly filteredTournaments = computed(() => {
    let list = this.tournaments();

    const q = this.searchQuery().trim().toLowerCase();
    if (q) {
      list = list.filter((t) => {
        const name = (t.name || t.title || '').toLowerCase();
        const game = (t.gameTitle || '').toLowerCase();
        return name.includes(q) || game.includes(q);
      });
    }

    const st = this.filterStatus();
    if (st) {
      list = list.filter((t) => {
        if (st === 'ONGOING') {
          return t.status === 'ONGOING' || t.status === 'IN_PROGRESS';
        }
        return t.status === st;
      });
    }

    const sort = this.sortBy();
    return [...list].sort((a, b) => {
      const dateA = new Date(a.startDate).getTime();
      const dateB = new Date(b.startDate).getTime();
      if (sort === 'date_asc') return dateA - dateB;
      if (sort === 'date_desc') return dateB - dateA;
      if (sort === 'fee_asc') return (a.entryFee || 0) - (b.entryFee || 0);
      if (sort === 'fee_desc') return (b.entryFee || 0) - (a.entryFee || 0);
      return 0;
    });
  });

  // Grouped matches by round for Bracket View
  readonly bracketRounds = computed(() => {
    const bracket = this.activeBracket();
    if (!bracket || !bracket.matches) return [];

    const roundsMap = new Map<number, MatchResponse[]>();
    for (const m of bracket.matches) {
      const r = m.round || 1;
      if (!roundsMap.has(r)) roundsMap.set(r, []);
      roundsMap.get(r)!.push(m);
    }

    return Array.from(roundsMap.entries())
      .sort(([rA], [rB]) => rA - rB)
      .map(([roundNumber, matches]) => ({
        roundNumber,
        roundTitle: this.getRoundTitle(roundNumber, roundsMap.size),
        matches
      }));
  });

  // ── Lifecycle ──────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      if (params['status']) this.filterStatus.set(params['status']);
      if (params['search']) this.searchQuery.set(params['search']);
    });

    this.loadTournaments();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── API Operations ─────────────────────────────────────────────────────────
  loadTournaments(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.tournamentAdminService.getTournaments()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.tournaments.set(data);
          this.isLoading.set(false);
        },
        error: (err) => {
          this.errorMessage.set(err?.message || 'Failed to load tournaments from service');
          this.isLoading.set(false);
          this.toast.error('Could not load tournaments');
        }
      });
  }

  openCreateModal(): void {
    this.createForm.reset({
      name: '',
      gameTitle: '',
      imageUrl: '',
      startDate: this.toLocalDatetimeStr(new Date(Date.now() + 7 * 86400000)),
      endDate: this.toLocalDatetimeStr(new Date(Date.now() + 8 * 86400000)),
      entryFee: 1500,
      maxParticipants: 16,
      registrationDeadline: this.toLocalDatetimeStr(new Date(Date.now() + 5 * 86400000))
    });
    this.createModalOpen.set(true);
  }

  submitCreate(): void {
    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      return;
    }

    const val = this.createForm.value;
    const req: TournamentRequest = {
      name: (val.name || '').trim(),
      gameTitle: (val.gameTitle || '').trim(),
      imageUrl: val.imageUrl ? String(val.imageUrl).trim() : undefined,
      startDate: new Date(val.startDate!).toISOString(),
      endDate: val.endDate ? new Date(val.endDate).toISOString() : undefined,
      entryFee: Number(val.entryFee) || 0,
      maxParticipants: Number(val.maxParticipants) || 16,
      registrationDeadline: new Date(val.registrationDeadline!).toISOString()
    };

    this.actionInFlight.set(true);
    this.tournamentAdminService.createTournament(req)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (created) => {
          this.actionInFlight.set(false);
          this.createModalOpen.set(false);
          this.toast.success(`Tournament "${created.name}" created and published!`);

          this.notifSocketService.sendNotification({
            type: 'TOURNAMENT_REGISTRATION',
            category: 'TOURNAMENT',
            title: 'Tournament Published',
            message: `Tournament "${created.name}" (${req.gameTitle}) is now open for registration.`,
            link: '/admin/tournaments',
            data: { tournamentId: created.id, name: created.name }
          });

          this.loadTournaments();
        },
        error: (err) => {
          this.actionInFlight.set(false);
          this.toast.error(err?.message || 'Failed to create tournament');
        }
      });
  }

  // ── Edit Tournament ─────────────────────────────────────────────────────────
  openEditModal(t: TournamentResponse, event?: Event): void {
    if (event) event.stopPropagation();
    this.selectedTournamentForEdit.set(t);

    const sDate = t.startDate ? this.toLocalDatetimeStr(new Date(t.startDate)) : '';
    const eDate = t.endDate ? this.toLocalDatetimeStr(new Date(t.endDate)) : '';
    const dDate = t.registrationDeadline ? this.toLocalDatetimeStr(new Date(t.registrationDeadline)) : '';

    this.editForm.reset({
      name: t.name || t.title || '',
      gameTitle: t.gameTitle || '',
      imageUrl: t.imageUrl || '',
      startDate: sDate,
      endDate: eDate,
      entryFee: t.entryFee ?? 0,
      maxParticipants: t.maxParticipants ?? 16,
      registrationDeadline: dDate
    });

    this.editModalOpen.set(true);
  }

  submitEdit(): void {
    const t = this.selectedTournamentForEdit();
    if (!t) return;

    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }

    const val = this.editForm.value;
    const req: TournamentRequest = {
      name: (val.name || '').trim(),
      gameTitle: (val.gameTitle || '').trim(),
      imageUrl: val.imageUrl ? String(val.imageUrl).trim() : undefined,
      startDate: new Date(val.startDate!).toISOString(),
      endDate: val.endDate ? new Date(val.endDate).toISOString() : undefined,
      entryFee: Number(val.entryFee) || 0,
      maxParticipants: Number(val.maxParticipants) || 16,
      registrationDeadline: new Date(val.registrationDeadline!).toISOString()
    };

    this.actionInFlight.set(true);
    this.tournamentAdminService.updateTournament(t.id, req)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updated) => {
          this.actionInFlight.set(false);
          this.editModalOpen.set(false);
          this.toast.success(`Tournament "${updated.name}" updated successfully!`);

          this.notifSocketService.sendNotification({
            type: 'TOURNAMENT_REGISTRATION',
            category: 'TOURNAMENT',
            title: 'Tournament Updated',
            message: `Tournament "${updated.name}" details have been updated.`,
            link: '/admin/tournaments',
            data: { tournamentId: updated.id, name: updated.name }
          });

          this.loadTournaments();
        },
        error: (err) => {
          this.actionInFlight.set(false);
          const msg = err?.error?.message || err?.message || 'Failed to update tournament';
          this.toast.error(msg);
        }
      });
  }

  // ── Status Management ──────────────────────────────────────────────────────
  openStatusModal(t: TournamentResponse, event?: Event): void {
    if (event) event.stopPropagation();
    this.selectedTournamentForStatus.set(t);
    this.statusForm.reset({
      status: t.status
    });
    this.statusModalOpen.set(true);
  }

  submitStatusChange(): void {
    const t = this.selectedTournamentForStatus();
    if (!t) return;

    const newStatus = this.statusForm.value.status as TournamentStatus;
    this.actionInFlight.set(true);

    this.tournamentAdminService.updateStatus(t.id, newStatus)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updated) => {
          this.actionInFlight.set(false);
          this.statusModalOpen.set(false);
          this.toast.success(`Tournament status changed to ${updated.status}`);
          this.loadTournaments();
        },
        error: (err) => {
          this.actionInFlight.set(false);
          this.toast.error(err?.message || 'Failed to update tournament status');
        }
      });
  }

  // ── Cancel Tournament ──────────────────────────────────────────────────────
  openCancelModal(t: TournamentResponse, event?: Event): void {
    if (event) event.stopPropagation();
    this.selectedTournamentForCancel.set(t);
    this.cancelModalOpen.set(true);
  }

  confirmCancel(): void {
    const t = this.selectedTournamentForCancel();
    if (!t) return;

    this.actionInFlight.set(true);

    // Fetch registered participants so all registered customers get notified
    this.tournamentAdminService.getRegistrations(t.id).pipe(
      takeUntil(this.destroy$),
      catchError(() => of([] as RegistrationResponse[])),
      switchMap((regs) => {
        const registeredUserIds = regs.map((r) => r.userId).filter(Boolean);
        return this.tournamentAdminService.cancelTournament(t.id).pipe(
          map(() => registeredUserIds)
        );
      })
    ).subscribe({
      next: (registeredUserIds) => {
        this.actionInFlight.set(false);
        this.cancelModalOpen.set(false);
        this.toast.success(`Tournament "${t.name}" has been cancelled`);

        this.notifSocketService.sendNotification({
          type: 'TOURNAMENT_CANCELLED',
          category: 'CANCEL',
          title: 'Tournament Cancelled',
          message: `Tournament "${t.name}" has been cancelled by the administrator.`,
          link: `/tournaments/${t.id}`,
          targetUserIds: registeredUserIds.length > 0 ? registeredUserIds : undefined,
          broadcast: registeredUserIds.length === 0,
          data: { tournamentId: t.id, name: t.name, registeredUserIds }
        });

        this.loadTournaments();
      },
      error: (err) => {
        this.actionInFlight.set(false);
        this.toast.error(err?.message || 'Failed to cancel tournament');
      }
    });
  }

  // ── Registrations Inspector ────────────────────────────────────────────────
  openRegistrations(t: TournamentResponse, event?: Event): void {
    if (event) event.stopPropagation();
    this.selectedTournamentForRegistrations.set(t);
    this.registrationsModalOpen.set(true);
    this.isRegistrationsLoading.set(true);

    this.tournamentAdminService.getRegistrations(t.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (regs) => {
          this.registrationsList.set(regs);
          this.isRegistrationsLoading.set(false);
        },
        error: () => {
          this.registrationsList.set([]);
          this.isRegistrationsLoading.set(false);
          this.toast.error('Failed to load registered participants');
        }
      });
  }

  // ── Knockout Bracket Management ───────────────────────────────────────────
  openBracket(t: TournamentResponse, event?: Event): void {
    if (event) event.stopPropagation();
    this.selectedTournamentForBracket.set(t);
    this.bracketModalOpen.set(true);
    this.isBracketLoading.set(true);

    this.tournamentAdminService.getBracket(t.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (brk) => {
          this.activeBracket.set(brk);
          this.isBracketLoading.set(false);
        },
        error: () => {
          this.activeBracket.set(null);
          this.isBracketLoading.set(false);
        }
      });
  }

  triggerGenerateBracket(): void {
    const t = this.selectedTournamentForBracket();
    if (!t) return;

    this.actionInFlight.set(true);
    this.tournamentAdminService.generateBracket(t.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (brk) => {
          this.activeBracket.set(brk);
          this.actionInFlight.set(false);
          this.toast.success('Single-elimination bracket generated successfully!');
        },
        error: (err) => {
          this.actionInFlight.set(false);
          this.toast.error(err?.message || 'Failed to generate bracket');
        }
      });
  }

  recordMatchWinner(match: MatchResponse, winnerId: string): void {
    const t = this.selectedTournamentForBracket();
    if (!t) return;

    this.actionInFlight.set(true);
    this.tournamentAdminService.recordMatchResult(t.id, match.id, winnerId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.actionInFlight.set(false);
          this.toast.success('Match winner recorded and bracket advanced!');
          // Reload bracket
          this.openBracket(t);
        },
        error: (err) => {
          this.actionInFlight.set(false);
          this.toast.error(err?.message || 'Failed to record match winner');
        }
      });
  }

  sendReminders(t: TournamentResponse, event?: Event): void {
    if (event) event.stopPropagation();
    this.actionInFlight.set(true);

    this.tournamentAdminService.getRegistrations(t.id).pipe(
      takeUntil(this.destroy$),
      catchError(() => of([] as RegistrationResponse[])),
      switchMap((regs) => {
        const registeredUserIds = regs.map((r) => r.userId).filter(Boolean);
        return this.tournamentAdminService.sendReminders(t.id).pipe(
          map(() => registeredUserIds)
        );
      })
    ).subscribe({
      next: (registeredUserIds) => {
        this.actionInFlight.set(false);
        this.toast.success(`Pre-tournament reminders sent to registered players`);
        this.notifSocketService.sendNotification({
          type: 'MATCH_REMINDER',
          category: 'TOURNAMENT',
          title: 'Match Starting Soon ⚡',
          message: `2-Hour Reminder: Upcoming match for ${t.name} (${t.gameTitle}) is starting soon!`,
          link: `/tournaments/${t.id}`,
          targetUserIds: registeredUserIds,
          data: { tournamentId: t.id, name: t.name, registeredUserIds }
        });
      },
      error: () => {
        this.actionInFlight.set(false);
        this.toast.error('Failed to dispatch notifications');
      }
    });
  }

  // ── Filter Events ──────────────────────────────────────────────────────────
  onSearchInput(q: string): void {
    this.searchQuery.set(q);
    this.syncQueryParams();
  }

  onStatusFilterChange(status: string): void {
    this.filterStatus.set(status);
    this.syncQueryParams();
  }

  onSortChange(sort: string): void {
    if (sort === 'date_asc' || sort === 'date_desc' || sort === 'fee_asc' || sort === 'fee_desc') {
      this.sortBy.set(sort);
    }
  }

  clearFilters(): void {
    this.searchQuery.set('');
    this.filterStatus.set('');
    this.sortBy.set('date_asc');
    this.syncQueryParams();
  }

  private syncQueryParams(): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        search: this.searchQuery() || null,
        status: this.filterStatus() || null
      },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  getStatusBadgeVariant(status: TournamentStatus): 'success' | 'warning' | 'info' | 'danger' | 'neutral' {
    switch (status) {
      case 'REGISTRATION_OPEN':
        return 'success';
      case 'ONGOING':
      case 'IN_PROGRESS':
        return 'info';
      case 'UPCOMING':
        return 'warning';
      case 'COMPLETED':
        return 'neutral';
      case 'CANCELLED':
        return 'danger';
      default:
        return 'neutral';
    }
  }

  getCapacityPercent(t: TournamentResponse): number {
    const count = t.participantCount ?? t.currentParticipants ?? 0;
    if (!t.maxParticipants) return 0;
    return Math.min(100, Math.round((count / t.maxParticipants) * 100));
  }

  formatDate(isoDate: string): string {
    if (!isoDate) return '—';
    const d = new Date(isoDate);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getRoundTitle(round: number, totalRounds: number): string {
    const diff = totalRounds - round;
    if (diff === 0) return 'Finals 👑';
    if (diff === 1) return 'Semifinals';
    if (diff === 2) return 'Quarterfinals';
    return `Round ${round}`;
  }

  private toLocalDatetimeStr(d: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
}
