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
    EmptyStateComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './my-tournaments.component.html',
  styleUrl: './my-tournaments.component.scss'
})
export class MyTournamentsComponent implements OnInit {
  private readonly tournamentService = inject(TournamentService);
  private readonly destroyRef = inject(DestroyRef);

  readonly allItems = signal<MyTournamentDisplayItem[]>([]);
  readonly activeTab = signal<'upcoming' | 'played'>('upcoming');
  readonly isLoading = signal<boolean>(true);
  readonly hasError = signal<boolean>(false);

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
    const isFuture = startDate.getTime() >= now;

    const isCancelled = reg.status === 'CANCELLED' || t?.status === 'CANCELLED';
    const isCompleted = t?.status === 'COMPLETED';
    const isUpcoming = isFuture && !isCancelled && !isCompleted;

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
      sortTimestamp: startDate.getTime()
    };
  }
}
