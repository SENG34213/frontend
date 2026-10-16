import { Injectable, inject } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Observable, of, catchError } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { MockDataService } from '../../../core/services/mock/mock-data.service';
import { environment } from '../../../../environments/environment';
import {
  GameTitle,
  CreateGameRequest,
  UpdateGameRequest,
  GameFilter,
  AdminGameStatsResponse
} from '../../../shared/models';

@Injectable({ providedIn: 'root' })
export class GameAdminService {
  private readonly api = inject(ApiService);
  private readonly mock = inject(MockDataService);

  private readonly gamesEndpoint = '/admin/games';

  /**
   * Get all games with search/platform/genre filters.
   */
  getGames(filter?: GameFilter): Observable<GameTitle[]> {
    if (environment.useMocks) {
      return this.mock.getAdminGames(filter);
    }

    let params = new HttpParams();
    if (filter?.search) params = params.set('search', filter.search);
    if (filter?.genre) params = params.set('genre', filter.genre);
    if (filter?.platform) params = params.set('platform', filter.platform);
    if (filter?.active !== undefined && filter?.active !== null) params = params.set('active', String(filter.active));
    if (filter?.featured !== undefined && filter?.featured !== null) params = params.set('featured', String(filter.featured));

    return this.api.get<GameTitle[]>(this.gamesEndpoint, { params }).pipe(
      catchError(() => this.mock.getAdminGames(filter))
    );
  }

  /**
   * Get single game by ID.
   */
  getGameById(id: string): Observable<GameTitle> {
    if (environment.useMocks) {
      return this.mock.getAdminGameById(id);
    }

    return this.api.get<GameTitle>(`${this.gamesEndpoint}/${id}`).pipe(
      catchError(() => this.mock.getAdminGameById(id))
    );
  }

  /**
   * Create a new game title in library.
   */
  createGame(request: CreateGameRequest): Observable<GameTitle> {
    if (environment.useMocks) {
      return this.mock.createAdminGame(request);
    }

    return this.api.post<GameTitle>(this.gamesEndpoint, request).pipe(
      catchError(() => this.mock.createAdminGame(request))
    );
  }

  /**
   * Update existing game.
   */
  updateGame(id: string, request: UpdateGameRequest): Observable<GameTitle> {
    if (environment.useMocks) {
      return this.mock.updateAdminGame(id, request);
    }

    return this.api.put<GameTitle>(`${this.gamesEndpoint}/${id}`, request).pipe(
      catchError(() => this.mock.updateAdminGame(id, request))
    );
  }

  /**
   * Delete game title.
   */
  deleteGame(id: string): Observable<void> {
    if (environment.useMocks) {
      return this.mock.deleteAdminGame(id);
    }

    return this.api.delete<void>(`${this.gamesEndpoint}/${id}`).pipe(
      catchError(() => this.mock.deleteAdminGame(id))
    );
  }

  /**
   * Quick toggle active status.
   */
  toggleGameActive(id: string): Observable<GameTitle> {
    if (environment.useMocks) {
      return this.mock.toggleAdminGameActive(id);
    }

    return this.api.patch<GameTitle>(`${this.gamesEndpoint}/${id}/toggle-active`, {}).pipe(
      catchError(() => this.mock.toggleAdminGameActive(id))
    );
  }

  /**
   * Get game catalog statistics.
   */
  getGameStats(): Observable<AdminGameStatsResponse> {
    if (environment.useMocks) {
      return this.mock.getAdminGameStats();
    }

    return this.api.get<AdminGameStatsResponse>(`${this.gamesEndpoint}/stats`).pipe(
      catchError(() => this.mock.getAdminGameStats())
    );
  }

  // ── Station - Game Configuration ──────────────────────────────────────────

  /**
   * Get all games installed on a given station.
   * Maps to GET /api/stations/{stationId}/games
   */
  getGamesForStation(stationId: string): Observable<GameTitle[]> {
    if (environment.useMocks) {
      return this.mock.getAdminGames();
    }

    return this.api.get<GameTitle[]>(`/stations/${stationId}/games`).pipe(
      catchError(() => this.mock.getAdminGames())
    );
  }

  /**
   * Configure/assign games to a station.
   * Maps to POST /api/stations/{stationId}/games
   */
  assignGamesToStation(stationId: string, gameIds: string[]): Observable<GameTitle[]> {
    if (environment.useMocks) {
      return this.mock.getAdminGames();
    }

    return this.api.post<GameTitle[]>(`/stations/${stationId}/games`, { gameIds }).pipe(
      catchError(() => this.mock.getAdminGames())
    );
  }

  /**
   * Remove a game from a station.
   * Maps to DELETE /api/stations/{stationId}/games/{gameId}
   */
  removeGameFromStation(stationId: string, gameId: string): Observable<void> {
    if (environment.useMocks) {
      return of(void 0);
    }

    return this.api.delete<void>(`/stations/${stationId}/games/${gameId}`).pipe(
      catchError(() => of(void 0))
    );
  }

  /**
   * Get all stations where this game is installed.
   * Maps to GET /api/games/{gameId}/stations
   */
  getStationsForGame(gameId: string): Observable<any[]> {
    if (environment.useMocks) {
      return of([]);
    }

    return this.api.get<any[]>(`${this.gamesEndpoint}/${gameId}/stations`).pipe(
      catchError(() => of([]))
    );
  }

  /**
   * Update stations where this game is installed.
   * Maps to PUT /api/games/{gameId}/stations
   */
  updateStationsForGame(gameId: string, stationIds: string[]): Observable<any[]> {
    if (environment.useMocks) {
      return of([]);
    }

    return this.api.put<any[]>(`${this.gamesEndpoint}/${gameId}/stations`, stationIds).pipe(
      catchError(() => of([]))
    );
  }
}

