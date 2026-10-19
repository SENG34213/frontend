import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';
import {
  TournamentResponse,
  RegistrationResponse,
  BracketResponse,
  TournamentStatus
} from '../../shared/models';

export interface TournamentViewItem extends TournamentResponse {
  spotsLeft: number;
  progressPercent: number;
  isFull: boolean;
  isClosingSoon: boolean;
  timeRemaining?: {
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isPast: boolean;
  };
}

@Injectable({ providedIn: 'root' })
export class TournamentService {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);

  private readonly endpoint = '/tournaments';

  /**
   * Retrieves all published tournaments.
   * Maps to GET /api/tournaments
   */
  getTournaments(): Observable<TournamentViewItem[]> {
    return this.api.get<TournamentResponse[]>(this.endpoint).pipe(
      map((list) => {
        const raw = Array.isArray(list) ? list : [];
        return raw.map((t) => this.enrichTournament(t));
      })
    );
  }

  /**
   * Retrieves a single tournament by ID.
   * Maps to GET /api/tournaments/{id}
   */
  getTournamentById(id: string): Observable<TournamentViewItem> {
    return this.api.get<TournamentResponse>(`${this.endpoint}/${id}`).pipe(
      map((t) => this.enrichTournament(t))
    );
  }

  /**
   * Registers current user for a tournament and processes entry fee payment.
   * Maps to POST /api/tournaments/{id}/register
   */
  registerForTournament(
    tournamentId: string,
    gamerTag?: string
  ): Observable<RegistrationResponse> {
    return this.api.post<RegistrationResponse>(`${this.endpoint}/${tournamentId}/register`, {
      gamerTag
    });
  }

  /**
   * Retrieves the tournament bracket and matches.
   * Maps to GET /api/tournaments/{id}/bracket
   */
  getBracket(tournamentId: string): Observable<BracketResponse> {
    return this.api.get<BracketResponse>(`${this.endpoint}/${tournamentId}/bracket`);
  }

  /**
   * Retrieves all registrations made by the current authenticated user.
   * Maps to GET /api/tournaments/my-registrations
   */
  getMyRegistrations(): Observable<RegistrationResponse[]> {
    return this.api.get<RegistrationResponse[]>(`${this.endpoint}/my-registrations`);
  }

  /**
   * Enriches a raw TournamentResponse with calculated view properties.
   */
  enrichTournament(raw: TournamentResponse): TournamentViewItem {
    const max = raw.maxParticipants || 16;
    const count = raw.participantCount ?? raw.currentParticipants ?? 0;
    const spotsLeft = Math.max(0, max - count);
    const progressPercent = Math.min(100, Math.round((count / max) * 100));
    const isFull = spotsLeft === 0;

    const deadline = raw.registrationDeadline ? new Date(raw.registrationDeadline).getTime() : 0;
    const now = Date.now();
    const diffHours = (deadline - now) / (1000 * 60 * 60);
    const isClosingSoon = diffHours > 0 && diffHours <= 24;

    const timeRemaining = this.calculateCountdown(raw.startDate);

    return {
      ...raw,
      name: raw.name || raw.title || 'Tournament',
      participantCount: count,
      spotsLeft,
      progressPercent,
      isFull,
      isClosingSoon,
      timeRemaining
    };
  }

  /**
   * Computes the live countdown to a given target date.
   */
  calculateCountdown(targetIsoDate: string): {
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isPast: boolean;
  } {
    if (!targetIsoDate) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true };
    }

    const target = new Date(targetIsoDate).getTime();
    const now = Date.now();
    const diff = target - now;

    if (diff <= 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true };
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    return { days, hours, minutes, seconds, isPast: false };
  }

  /**
   * Helper to format currency in LKR.
   */
  formatLkr(amount: number): string {
    if (amount === 0) return 'FREE';
    return `LKR ${amount.toLocaleString('en-US')}`;
  }

  /**
   * Helper to get user-friendly status badge label and variant.
   */
  getStatusBadgeInfo(
    status: TournamentStatus,
    isFull: boolean,
    isRegistrationOpen?: boolean
  ): { label: string; variant: 'primary' | 'accent' | 'available' | 'occupied' | 'warning' | 'info' } {
    if (status === 'CANCELLED') {
      return { label: 'CANCELLED', variant: 'occupied' };
    }
    if (status === 'COMPLETED') {
      return { label: 'COMPLETED', variant: 'info' };
    }
    if (status === 'ONGOING' || status === 'IN_PROGRESS') {
      return { label: 'LIVE NOW', variant: 'accent' };
    }
    if (isFull) {
      return { label: 'FULL', variant: 'occupied' };
    }
    if (status === 'REGISTRATION_OPEN' || isRegistrationOpen) {
      return { label: 'REGISTRATION OPEN', variant: 'available' };
    }
    return { label: 'UPCOMING', variant: 'primary' };
  }
}
