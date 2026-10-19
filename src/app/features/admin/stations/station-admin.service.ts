import { Injectable, inject } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import {
  Station,
  GameStationRequest,
  GameStationResponse,
  SlotAvailabilityResponse
} from '../../../shared/models';

@Injectable({ providedIn: 'root' })
export class StationAdminService {
  private readonly api = inject(ApiService);

  private readonly stationsEndpoint = '/stations';

  /**
   * Get all game stations.
   * Maps to GET /api/stations
   */
  getAllStations(): Observable<Station[]> {
    return this.api.get<Station[]>(this.stationsEndpoint).pipe(
      map((stations) => stations.map((s) => ({
        ...s,
        stationCode: s.stationCode || (s as unknown as { code?: string }).code || `ST-${s.id.slice(0, 4)}`,
        name: s.name || `${s.stationCode || 'Station'} (${s.type})`
      })))
    );
  }

  /**
   * Get a single station by UUID.
   * Maps to GET /api/stations/{id}
   */
  getStationById(id: string): Observable<Station> {
    return this.api.get<Station>(`${this.stationsEndpoint}/${id}`);
  }

  /**
   * Get slot availability for a station on a given date (ISO YYYY-MM-DD).
   * Maps to GET /api/stations/{id}/availability?date=...
   */
  getAvailability(stationId: string, dateStr: string): Observable<SlotAvailabilityResponse[]> {
    const params = new HttpParams().set('date', dateStr);
    return this.api.get<SlotAvailabilityResponse[]>(`${this.stationsEndpoint}/${stationId}/availability`, { params });
  }

  /**
   * Create a new game station (ADMIN only).
   * Maps to POST /api/stations
   */
  createStation(request: GameStationRequest): Observable<GameStationResponse> {
    return this.api.post<GameStationResponse>(this.stationsEndpoint, request);
  }

  /**
   * Update an existing game station (ADMIN only).
   * Maps to PUT /api/stations/{id}
   */
  updateStation(id: string, request: GameStationRequest): Observable<GameStationResponse> {
    return this.api.put<GameStationResponse>(`${this.stationsEndpoint}/${id}`, request);
  }

  /**
   * Soft-delete / deactivate station (ADMIN only).
   * Maps to DELETE /api/stations/{id}
   */
  deleteStation(id: string): Observable<void> {
    return this.api.delete<void>(`${this.stationsEndpoint}/${id}`);
  }
}
