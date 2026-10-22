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
import { RouterModule } from '@angular/router';
import { TournamentService } from '../../../core/services/tournament.service';
import { TournamentResponse } from '../../../shared/models';
import { SkeletonComponent } from '../../ui/skeleton/skeleton.component';

export interface TickerTournamentItem {
  id: string;
  name: string;
  gameTitle: string;
  startDate: string;
  entryFee: number;
  maxParticipants: number;
  participantCount: number;
  spotsLeft: number;
  formattedDate: string;
  formattedFee: string;
  formattedSpots: string;
}

export function computeSpotsLeft(max: number, current: number): number {
  return Math.max(0, (max || 0) - (current || 0));
}

export function formatTournamentDate(isoString: string): string {
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return '';

  const dParts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Colombo',
    weekday: 'short',
    day: 'numeric',
    month: 'short'
  }).formatToParts(date);

  const tStr = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Colombo',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }).format(date);

  const weekday = dParts.find((p) => p.type === 'weekday')?.value ?? '';
  const day = dParts.find((p) => p.type === 'day')?.value ?? '';
  const month = dParts.find((p) => p.type === 'month')?.value ?? '';

  return `${weekday} ${day} ${month} · ${tStr}`;
}

export function formatLkr(amount: number): string {
  if (!amount || amount === 0) return 'FREE';
  return `LKR ${Number(amount).toLocaleString('en-US')}`;
}

export function formatSpots(spots: number): string {
  if (spots <= 0) return '0 spots left';
  if (spots === 1) return '1 spot left';
  return `${spots} spots left`;
}

export function filterAndSortUpcomingTournaments(
  list: TournamentResponse[],
  referenceNow: number = Date.now()
): TickerTournamentItem[] {
  if (!Array.isArray(list)) return [];

  return list
    .filter((t) => {
      const isUpcomingStatus = t.status === 'UPCOMING' || t.status === 'REGISTRATION_OPEN';
      if (!isUpcomingStatus) return false;
      const startTime = new Date(t.startDate).getTime();
      return !isNaN(startTime) && startTime > referenceNow;
    })
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
    .slice(0, 8)
    .map((t) => {
      const max = t.maxParticipants ?? 16;
      const current = t.participantCount ?? (t as { currentParticipants?: number }).currentParticipants ?? 0;
      const spots = computeSpotsLeft(max, current);
      return {
        id: t.id,
        name: t.name || (t as { title?: string }).title || 'Tournament',
        gameTitle: t.gameTitle || '',
        startDate: t.startDate,
        entryFee: t.entryFee,
        maxParticipants: max,
        participantCount: current,
        spotsLeft: spots,
        formattedDate: formatTournamentDate(t.startDate),
        formattedFee: formatLkr(t.entryFee),
        formattedSpots: formatSpots(spots)
      };
    });
}

@Component({
  selector: 'gc-tournament-ticker',
  standalone: true,
  imports: [CommonModule, RouterModule, SkeletonComponent],
  templateUrl: './tournament-ticker.component.html',
  styleUrl: './tournament-ticker.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TournamentTickerComponent implements OnInit {
  private readonly tournamentService = inject(TournamentService);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly tournaments = signal<TickerTournamentItem[]>([]);
  readonly isLoading = signal(true);

  readonly animationDuration = computed(() => {
    const count = this.tournaments().length;
    return `${Math.max(12, count * 6)}s`;
  });

  ngOnInit(): void {
    this.loadTournaments();
  }

  loadTournaments(): void {
    this.isLoading.set(true);
    this.tournamentService.getTournaments().subscribe({
      next: (data) => {
        const filtered = filterAndSortUpcomingTournaments(data);
        this.tournaments.set(filtered);
        this.isLoading.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.tournaments.set([]);
        this.isLoading.set(false);
        this.cdr.markForCheck();
      }
    });
  }
}
