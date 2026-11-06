import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { forkJoin } from 'rxjs';
import { TournamentService, TournamentViewItem } from '../../core/services/tournament.service';
import { RegistrationResponse, TournamentStatus } from '../../shared/models/tournament.model';
import { CardComponent } from '../../shared/ui/card/card.component';
import { BadgeComponent, BadgeVariant } from '../../shared/ui/badge/badge.component';
import { TabsComponent, TabItem } from '../../shared/ui/tabs/tabs.component';
import { SkeletonComponent } from '../../shared/ui/skeleton/skeleton.component';
import { EmptyStateComponent } from '../../shared/ui/empty-state/empty-state.component';
import { ButtonComponent } from '../../shared/ui/button/button.component';
import { ModalComponent } from '../../shared/ui/modal/modal.component';
import { ToastService } from '../../shared/ui/toast/toast.service';

export interface MyTournamentDisplayItem {
  registrationId: string;
  tournamentId: string;
  tournamentName: string;
  gameTitle: string;
  startDateIso: string;
  formattedDate: string;
  formattedTime: string;
  regStatus: RegistrationResponse['status'];
  tournamentStatus: TournamentStatus;
  badgeLabel: string;
  badgeVariant: BadgeVariant;
  entryFee: number;
  resultPlacement?: string;
  isUpcoming: boolean;
  sortTimestamp: number;
  canComplete: boolean;
  isPastStartDate: boolean;
}

@Component({
  selector: 'gc-my-tournaments',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    CardComponent,
    BadgeComponent,
    TabsComponent,
    SkeletonComponent,
    EmptyStateComponent,
    ButtonComponent,
    ModalComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './my-tournaments.component.html',
  styleUrl: './my-tournaments.component.scss'
})
export class MyTournamentsComponent implements OnInit {
  private readonly tournamentService = inject(TournamentService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  readonly allItems = signal<MyTournamentDisplayItem[]>([]);
  readonly activeTab = signal<'upcoming' | 'played'>('upcoming');
  readonly isLoading = signal<boolean>(true);
  readonly hasError = signal<boolean>(false);

  // ── Completion Modal State ────────────────────────────────────────────────
  readonly completeModalOpen = signal<boolean>(false);
  readonly selectedTournamentForComplete = signal<MyTournamentDisplayItem | null>(null);
  readonly isCompletingTournament = signal<boolean>(false);
  readonly completeError = signal<string | null>(null);

  readonly upcomingList = computed(() => {
    return this.allItems()
      .filter((item) => item.isUpcoming)
      .sort((a, b) => a.sortTimestamp - b.sortTimestamp); // soonest first
  });

  readonly playedList = computed(() => {
    return this.allItems()
      .filter((item) => !item.isUpcoming)
      .sort((a, b) => b.sortTimestamp - a.sortTimestamp); // newest first
  });

  readonly tabs = computed<TabItem[]>(() => [
    {
      id: 'upcoming',
      label: 'Upcoming',
      badge: this.upcomingList().length
    },
    {
      id: 'played',
      label: 'Played',
      badge: this.playedList().length
    }
  ]);

  readonly currentList = computed(() => {
    return this.activeTab() === 'upcoming'
      ? this.upcomingList()
      : this.playedList();
  });

  ngOnInit(): void {
    this.loadMyTournaments();
  }

  loadMyTournaments(): void {
    this.isLoading.set(true);
    this.hasError.set(false);

    // Combining registrations + tournaments in a single forkJoin (exactly 2 calls, preventing N+1)
    forkJoin({
      registrations: this.tournamentService.getMyRegistrations(),
      tournaments: this.tournamentService.getTournaments()
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: ({ registrations, tournaments }) => {
        const tournamentMap = new Map<string, TournamentViewItem>();
        (tournaments || []).forEach((t) => tournamentMap.set(t.id, t));

        const mapped: MyTournamentDisplayItem[] = (registrations || []).map((reg) => {
          const t = tournamentMap.get(reg.tournamentId);
          return this.mapToDisplayItem(reg, t);
        });

        this.allItems.set(mapped);
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

  // ── Completion Actions ────────────────────────────────────────────────────
  openCompleteModal(item: MyTournamentDisplayItem): void {
    this.selectedTournamentForComplete.set(item);
    this.completeError.set(null);
    this.completeModalOpen.set(true);
  }

  closeCompleteModal(): void {
    if (this.isCompletingTournament()) return;
    this.completeModalOpen.set(false);
    this.selectedTournamentForComplete.set(null);
    this.completeError.set(null);
  }

  confirmCompleteTournament(): void {
    const item = this.selectedTournamentForComplete();
    if (!item) return;

    this.isCompletingTournament.set(true);
    this.completeError.set(null);

    this.tournamentService.completeTournament(item.tournamentId).subscribe({
      next: () => {
        this.isCompletingTournament.set(false);
        this.completeModalOpen.set(false);
        this.selectedTournamentForComplete.set(null);
        this.toast.success(
          'Tournament Completed',
          `Your participation in ${item.tournamentName} has been recorded as completed!`
        );
        this.loadMyTournaments();
        this.activeTab.set('played');
      },
      error: (err) => {
        this.isCompletingTournament.set(false);
        this.completeError.set(err?.message || 'Failed to complete tournament. Please try again.');
      }
    });
  }

  private mapToDisplayItem(
    reg: RegistrationResponse,
    t?: TournamentViewItem
  ): MyTournamentDisplayItem {
    const tournamentName = t?.name || reg.tournamentName || 'Tournament';
    const gameTitle = t?.gameTitle || 'PS5 Competition';
    const startDateIso = t?.startDate || reg.registeredAt;
    const entryFee = t?.entryFee || 0;

    const startDate = new Date(startDateIso);
    const now = Date.now();
    const isPastStartDate = startDate.getTime() < now;

    const isCancelled = reg.status === 'CANCELLED' || t?.status === 'CANCELLED';
    const isCompleted = t?.status === 'COMPLETED';
    // A tournament remains in Upcoming until it is explicitly completed or cancelled!
    const isUpcoming = !isCancelled && !isCompleted;
    const canComplete = isUpcoming && (t?.status === 'ONGOING' || t?.status === 'IN_PROGRESS' || isPastStartDate);

    let badgeLabel = 'REGISTERED';
    let badgeVariant: BadgeVariant = 'success';

    if (isCancelled) {
      badgeLabel = 'CANCELLED';
      badgeVariant = 'danger';
    } else if (isCompleted) {
      badgeLabel = 'COMPLETED';
      badgeVariant = 'primary';
    } else if (reg.status === 'PENDING_PAYMENT') {
      badgeLabel = 'PAYMENT PENDING';
      badgeVariant = 'warning';
    } else if (t?.status === 'ONGOING' || t?.status === 'IN_PROGRESS') {
      badgeLabel = 'IN PROGRESS';
      badgeVariant = 'accent';
    }

    const formattedDate = startDate.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });

    const formattedTime = startDate.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

    const resultPlacement = isCompleted
      ? 'Official Participant'
      : (reg.gamerTag ? `GamerTag: ${reg.gamerTag}` : 'Confirmed Slot');

    return {
      registrationId: reg.id,
      tournamentId: reg.tournamentId,
      tournamentName,
      gameTitle,
      startDateIso,
      formattedDate,
      formattedTime,
      regStatus: reg.status,
      tournamentStatus: t?.status || 'UPCOMING',
      badgeLabel,
      badgeVariant,
      entryFee,
      resultPlacement,
      isUpcoming,
      sortTimestamp: startDate.getTime(),
      canComplete,
      isPastStartDate
    };
  }
}
