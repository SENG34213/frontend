import { Injectable, inject } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import {
  GameTitle,
  CreateGameRequest,
  UpdateGameRequest,
  GameFilter,
  AdminGameStatsResponse,
  Station
} from '../../../shared/models';

@Injectable({ providedIn: 'root' })
export class GameAdminService {
  private readonly api = inject(ApiService);

  private readonly gamesEndpoint = '/admin/games';

  /**
   * Get all games with search/platform/genre filters.
   */
  getGames(filter?: GameFilter): Observable<GameTitle[]> {
    let params = new HttpParams();
    if (filter?.search) params = params.set('search', filter.search);
    if (filter?.genre) params = params.set('genre', filter.genre);
    if (filter?.platform) params = params.set('platform', filter.platform);
    if (filter?.active !== undefined && filter?.active !== null) params = params.set('active', String(filter.active));
    if (filter?.featured !== undefined && filter?.featured !== null) params = params.set('featured', String(filter.featured));

    return this.api.get<GameTitle[]>(this.gamesEndpoint, { params });
  }

  /**
   * Get single game by ID.
   */
  getGameById(id: string): Observable<GameTitle> {
    return this.api.get<GameTitle>(`${this.gamesEndpoint}/${id}`);
  }

  /**
   * Create a new game title in library.
   */
  createGame(request: CreateGameRequest): Observable<GameTitle> {
    return this.api.post<GameTitle>(this.gamesEndpoint, request);
  }

  /**
   * Update existing game.
   */
  updateGame(id: string, request: UpdateGameRequest): Observable<GameTitle> {
    return this.api.put<GameTitle>(`${this.gamesEndpoint}/${id}`, request);
  }

  /**
   * Delete game title.
   */
  deleteGame(id: string): Observable<void> {
    return this.api.delete<void>(`${this.gamesEndpoint}/${id}`);
  }

  /**
   * Quick toggle active status.
   */
  toggleGameActive(id: string): Observable<GameTitle> {
    return this.api.patch<GameTitle>(`${this.gamesEndpoint}/${id}/toggle-active`, {});
  }

  /**
   * Get game catalog statistics.
   */
  getGameStats(): Observable<AdminGameStatsResponse> {
    return this.api.get<AdminGameStatsResponse>(`${this.gamesEndpoint}/stats`);
  }

  // ── Station - Game Configuration ──────────────────────────────────────────

  /**
   * Get all games installed on a given station.
   * Maps to GET /api/stations/{stationId}/games
   */
  getGamesForStation(stationId: string): Observable<GameTitle[]> {
    return this.api.get<GameTitle[]>(`/stations/${stationId}/games`);
  }

  /**
   * Configure/assign games to a station.
   * Maps to POST /api/stations/{stationId}/games
   */
  assignGamesToStation(stationId: string, gameIds: string[]): Observable<GameTitle[]> {
    return this.api.post<GameTitle[]>(`/stations/${stationId}/games`, { gameIds });
  }

  /**
   * Remove a game from a station.
   * Maps to DELETE /api/stations/{stationId}/games/{gameId}
   */
  removeGameFromStation(stationId: string, gameId: string): Observable<void> {
    return this.api.delete<void>(`/stations/${stationId}/games/${gameId}`);
  }

  /**
   * Get all stations where this game is installed.
   * Maps to GET /api/games/{gameId}/stations
   */
  getStationsForGame(gameId: string): Observable<Station[]> {
    return this.api.get<Station[]>(`${this.gamesEndpoint}/${gameId}/stations`);
  }

  /**
   * Update stations where this game is installed.
   * Maps to PUT /api/games/{gameId}/stations
   */
  updateStationsForGame(gameId: string, stationIds: string[]): Observable<Station[]> {
    return this.api.put<Station[]>(`${this.gamesEndpoint}/${gameId}/stations`, stationIds);
  }
}

