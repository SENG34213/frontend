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
import { ActivatedRoute, Router, RouterModule } from '@angular/router';

import { TournamentService, TournamentViewItem } from '../../../core/services/tournament.service';
import { BracketResponse, MatchResponse } from '../../../shared/models';

import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { BadgeComponent } from '../../../shared/ui/badge/badge.component';
import { CardComponent } from '../../../shared/ui/card/card.component';
import { SkeletonComponent } from '../../../shared/ui/skeleton/skeleton.component';
import { EmptyStateComponent } from '../../../shared/ui/empty-state/empty-state.component';

export interface RoundGroup {
  roundNumber: number;
  roundName: string;
  matches: MatchResponse[];
}

@Component({
  selector: 'gc-tournament-bracket',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ButtonComponent,
    SkeletonComponent,
    EmptyStateComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './tournament-bracket.component.html',
  styleUrl: './tournament-bracket.component.scss'
})
export class TournamentBracketComponent implements OnInit {
  readonly tournamentService = inject(TournamentService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  // ─── Signals ────────────────────────────────────────────────────────────────
  readonly tournamentId = signal<string>('');
  readonly tournament = signal<TournamentViewItem | null>(null);
  readonly bracket = signal<BracketResponse | null>(null);

  readonly isLoading = signal(true);
  readonly errorMessage = signal<string | null>(null);

  // ─── Computed Values ────────────────────────────────────────────────────────

  /**
   * Group matches by round numbers and assign human-friendly round names.
   */
  readonly roundGroups = computed<RoundGroup[]>(() => {
    const b = this.bracket();
    if (!b || !b.matches || b.matches.length === 0) return [];

    // Find max round number
    const maxRound = Math.max(...b.matches.map((m) => m.round || 1));

    const groupsMap = new Map<number, MatchResponse[]>();
    for (const match of b.matches) {
      const r = match.round || 1;
      if (!groupsMap.has(r)) {
        groupsMap.set(r, []);
      }
      groupsMap.get(r)!.push(match);
    }

    const result: RoundGroup[] = [];
    const sortedRounds = Array.from(groupsMap.keys()).sort((a, b) => a - b);

    for (const r of sortedRounds) {
      let roundName = `Round ${r}`;
      if (r === maxRound && maxRound > 1) {
        roundName = 'Grand Finals';
      } else if (r === maxRound - 1 && maxRound > 2) {
        roundName = 'Semi-Finals';
      } else if (r === maxRound - 2 && maxRound > 3) {
        roundName = 'Quarter-Finals';
      }

      result.push({
        roundNumber: r,
        roundName,
        matches: groupsMap.get(r)!
      });
    }

    return result;
  });

  /**
   * Check if a champion is decided (winner of the last round match).
   */
  readonly champion = computed<{ name: string; id: string } | null>(() => {
    const groups = this.roundGroups();
    if (!groups.length) return null;

    const finalRound = groups[groups.length - 1];
    if (finalRound && finalRound.matches.length > 0) {
      const finalMatch = finalRound.matches[0];
      if (finalMatch.winnerId) {
        const name = finalMatch.winnerName ||
          (finalMatch.winnerId === finalMatch.participant1Id ? finalMatch.participant1Name : finalMatch.participant2Name) ||
          'Champion Player';
        return { name, id: finalMatch.winnerId };
      }
    }
    return null;
  });

  // ─── Lifecycle ─────────────────────────────────────────────────────────────

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') || '';
    this.tournamentId.set(id);

    if (id) {
      this.loadData(id);
    } else {
      this.errorMessage.set('Invalid tournament ID.');
      this.isLoading.set(false);
    }
  }

  // ─── Data Loading ──────────────────────────────────────────────────────────

  loadData(id: string): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    // Load tournament info
    this.tournamentService.getTournamentById(id).subscribe({
      next: (t) => {
        this.tournament.set(t);
        this.cdr.markForCheck();
      },
      error: () => {
        // Non-blocking
      }
    });

    // Load bracket
    this.tournamentService.getBracket(id).subscribe({
      next: (b) => {
        this.bracket.set(b);
        this.isLoading.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        // Bracket may not exist yet
        this.bracket.set(null);
        this.isLoading.set(false);
        this.cdr.markForCheck();
      }
    });
  }

  refreshBracket(): void {
    const id = this.tournamentId();
    if (id) {
      this.loadData(id);
    }
  }

  goBack(): void {
    const id = this.tournamentId();
    if (id) {
      this.router.navigate(['/tournaments', id]);
    } else {
      this.router.navigate(['/tournaments']);
    }
  }

  getParticipantName(name?: string, id?: string): string {
    if (name) return name;
    if (id) return `Player ${id.substring(0, 5)}`;
    return 'TBD / BYE';
  }

  isWinner(match: MatchResponse, participantId?: string): boolean {
    if (!match.winnerId || !participantId) return false;
    return match.winnerId === participantId;
  }
}
