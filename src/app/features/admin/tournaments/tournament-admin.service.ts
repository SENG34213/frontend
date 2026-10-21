import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
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

  private readonly tournamentsEndpoint = '/tournaments';

  /**
   * Get all tournaments.
   * Maps to GET /api/tournaments
   */
  getTournaments(): Observable<TournamentResponse[]> {
    return this.api.get<TournamentResponse[]>(this.tournamentsEndpoint).pipe(
      map((list) => list.map((t) => ({
        ...t,
        name: t.name || t.title || 'Tournament',
        participantCount: t.participantCount ?? t.currentParticipants ?? 0
      })))
    );
  }

  /**
   * Get tournament by ID.
   * Maps to GET /api/tournaments/{id}
   */
  getTournamentById(id: string): Observable<TournamentResponse> {
    return this.api.get<TournamentResponse>(`${this.tournamentsEndpoint}/${id}`).pipe(
      map((t) => ({
        ...t,
        name: t.name || t.title || 'Tournament',
        participantCount: t.participantCount ?? t.currentParticipants ?? 0
      }))
    );
  }

  /**
   * Create a new tournament.
   * Maps to POST /api/tournaments
   */
  createTournament(request: TournamentRequest): Observable<TournamentResponse> {
    return this.api.post<TournamentResponse>(this.tournamentsEndpoint, request);
  }

  /**
   * Update tournament information.
   * Maps to PUT /api/tournaments/{id}
   */
  updateTournament(id: string, request: TournamentRequest): Observable<TournamentResponse> {
    return this.api.put<TournamentResponse>(`${this.tournamentsEndpoint}/${id}`, request);
  }

  /**
   * Update tournament status.
   * Maps to PATCH /api/tournaments/{id}/status
   */
  updateStatus(id: string, status: TournamentStatus): Observable<TournamentResponse> {
    return this.api.patch<TournamentResponse>(`${this.tournamentsEndpoint}/${id}/status`, { status });
  }

  /**
   * Cancel tournament.
   * Maps to POST /api/tournaments/{id}/cancel
   */
  cancelTournament(id: string): Observable<TournamentResponse> {
    return this.api.post<TournamentResponse>(`${this.tournamentsEndpoint}/${id}/cancel`, {});
  }

  /**
   * Get registered participants in real-time.
   * Maps to GET /api/tournaments/{id}/registrations
   */
  getRegistrations(tournamentId: string): Observable<RegistrationResponse[]> {
    return this.api.get<RegistrationResponse[]>(`${this.tournamentsEndpoint}/${tournamentId}/registrations`);
  }

  /**
   * Generate single-elimination tournament bracket.
   * Maps to POST /api/tournaments/{id}/bracket/generate
   */
  generateBracket(tournamentId: string): Observable<BracketResponse> {
    return this.api.post<BracketResponse>(`${this.tournamentsEndpoint}/${tournamentId}/bracket/generate`, {});
  }

  /**
   * Get full bracket matches and rounds.
   * Maps to GET /api/tournaments/{id}/bracket
   */
  getBracket(tournamentId: string): Observable<BracketResponse> {
    return this.api.get<BracketResponse>(`${this.tournamentsEndpoint}/${tournamentId}/bracket`);
  }

  /**
   * Record match winner and auto-advance the bracket.
   * Maps to PATCH /api/tournaments/{id}/bracket/matches/{matchId}/result
   */
  recordMatchResult(tournamentId: string, matchId: string, winnerId: string): Observable<MatchResponse> {
    return this.api.patch<MatchResponse>(
      `${this.tournamentsEndpoint}/${tournamentId}/bracket/matches/${matchId}/result`,
      { winnerId }
    );
  }

  /**
   * Trigger 2-hour pre-tournament reminder emails/SMS to registered players.
   * Maps to POST /api/tournaments/{id}/notify-reminders
   */
  sendReminders(tournamentId: string): Observable<void> {
    return this.api.post<void>(`${this.tournamentsEndpoint}/${tournamentId}/notify-reminders`, {});
  }
}
