import { Injectable, inject } from '@angular/core';
import { Observable, of, map, catchError } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { MockDataService } from '../../../core/services/mock/mock-data.service';
import { environment } from '../../../../environments/environment';
import {
  TournamentResponse,
  TournamentRequest,
  TournamentStatus,
  RegistrationResponse,
  BracketResponse,
  MatchResponse
} from '../../../shared/models';

@Injectable({ providedIn: 'root' })
export class TournamentAdminService {
  private readonly api = inject(ApiService);
  private readonly mock = inject(MockDataService);

  private readonly tournamentsEndpoint = '/tournaments';

  /**
   * Get all tournaments.
   * Maps to GET /api/tournaments
   */
  getTournaments(): Observable<TournamentResponse[]> {
    if (environment.useMocks) {
      return this.mock.getTournaments();
    }

    return this.api.get<TournamentResponse[]>(this.tournamentsEndpoint).pipe(
      map((list) => list.map((t) => ({
        ...t,
        name: t.name || t.title || 'Tournament',
        participantCount: t.participantCount ?? t.currentParticipants ?? 0
      }))),
      catchError(() => this.mock.getTournaments())
    );
  }

  /**
   * Get tournament by ID.
   * Maps to GET /api/tournaments/{id}
   */
  getTournamentById(id: string): Observable<TournamentResponse> {
    if (environment.useMocks) {
      return this.mock.getTournamentById(id);
    }

    return this.api.get<TournamentResponse>(`${this.tournamentsEndpoint}/${id}`).pipe(
      map((t) => ({
        ...t,
        name: t.name || t.title || 'Tournament',
        participantCount: t.participantCount ?? t.currentParticipants ?? 0
      })),
      catchError(() => this.mock.getTournamentById(id))
    );
  }

  /**
   * Create a new tournament.
   * Maps to POST /api/tournaments
   */
  createTournament(request: TournamentRequest): Observable<TournamentResponse> {
    if (environment.useMocks) {
      return this.mock.createTournament(request);
    }

    return this.api.post<TournamentResponse>(this.tournamentsEndpoint, request).pipe(
      catchError(() => this.mock.createTournament(request))
    );
  }

  /**
   * Update tournament status.
   * Maps to PATCH /api/tournaments/{id}/status
   */
  updateStatus(id: string, status: TournamentStatus): Observable<TournamentResponse> {
    if (environment.useMocks) {
      return this.mock.updateTournamentStatus(id, status);
    }

    return this.api.patch<TournamentResponse>(`${this.tournamentsEndpoint}/${id}/status`, { status }).pipe(
      catchError(() => this.mock.updateTournamentStatus(id, status))
    );
  }

  /**
   * Cancel tournament.
   * Maps to POST /api/tournaments/{id}/cancel
   */
  cancelTournament(id: string): Observable<TournamentResponse> {
    if (environment.useMocks) {
      return this.mock.cancelTournament(id);
    }

    return this.api.post<TournamentResponse>(`${this.tournamentsEndpoint}/${id}/cancel`, {}).pipe(
      catchError(() => this.mock.cancelTournament(id))
    );
  }

  /**
   * Get registered participants in real-time.
   * Maps to GET /api/tournaments/{id}/registrations
   */
  getRegistrations(tournamentId: string): Observable<RegistrationResponse[]> {
    if (environment.useMocks) {
      return this.mock.getTournamentRegistrations(tournamentId);
    }

    return this.api.get<RegistrationResponse[]>(`${this.tournamentsEndpoint}/${tournamentId}/registrations`).pipe(
      catchError(() => this.mock.getTournamentRegistrations(tournamentId))
    );
  }

  /**
   * Generate single-elimination tournament bracket.
   * Maps to POST /api/tournaments/{id}/bracket/generate
   */
  generateBracket(tournamentId: string): Observable<BracketResponse> {
    if (environment.useMocks) {
      return this.mock.generateBracket(tournamentId);
    }

    return this.api.post<BracketResponse>(`${this.tournamentsEndpoint}/${tournamentId}/bracket/generate`, {}).pipe(
      catchError(() => this.mock.generateBracket(tournamentId))
    );
  }

  /**
   * Get full bracket matches and rounds.
   * Maps to GET /api/tournaments/{id}/bracket
   */
  getBracket(tournamentId: string): Observable<BracketResponse> {
    if (environment.useMocks) {
      return this.mock.getBracket(tournamentId);
    }

    return this.api.get<BracketResponse>(`${this.tournamentsEndpoint}/${tournamentId}/bracket`).pipe(
      catchError(() => this.mock.getBracket(tournamentId))
    );
  }

  /**
   * Record match winner and auto-advance the bracket.
   * Maps to PATCH /api/tournaments/{id}/bracket/matches/{matchId}/result
   */
  recordMatchResult(tournamentId: string, matchId: string, winnerId: string): Observable<MatchResponse> {
    if (environment.useMocks) {
      return this.mock.recordMatchResult(tournamentId, matchId, winnerId);
    }

    return this.api.patch<MatchResponse>(
      `${this.tournamentsEndpoint}/${tournamentId}/bracket/matches/${matchId}/result`,
      { winnerId }
    ).pipe(
      catchError(() => this.mock.recordMatchResult(tournamentId, matchId, winnerId))
    );
  }

  /**
   * Trigger 2-hour pre-tournament reminder emails/SMS to registered players.
   * Maps to POST /api/tournaments/{id}/notify-reminders
   */
  sendReminders(tournamentId: string): Observable<void> {
    if (environment.useMocks) {
      return of(void 0);
    }

    return this.api.post<void>(`${this.tournamentsEndpoint}/${tournamentId}/notify-reminders`, {}).pipe(
      catchError(() => of(void 0))
    );
  }
}
