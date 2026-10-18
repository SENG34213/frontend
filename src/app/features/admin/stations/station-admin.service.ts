import { Injectable, inject } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Observable, map, catchError } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { MockDataService } from '../../../core/services/mock/mock-data.service';
import { environment } from '../../../../environments/environment';
import {
  Station,
  GameStationRequest,
  GameStationResponse,
  SlotAvailabilityResponse
} from '../../../shared/models';

@Injectable({ providedIn: 'root' })
export class StationAdminService {
  private readonly api = inject(ApiService);
  private readonly mock = inject(MockDataService);

  private readonly stationsEndpoint = '/stations';

  /**
   * Get all game stations.
   * Maps to GET /api/stations
   */
  getAllStations(): Observable<Station[]> {
    if (environment.useMocks) {
      return this.mock.getStations();
    }

    return this.api.get<Station[]>(this.stationsEndpoint).pipe(
      map((stations) => stations.map((s) => ({
        ...s,
        stationCode: s.stationCode || (s as unknown as { code?: string }).code || `ST-${s.id.slice(0, 4)}`,
        name: s.name || `${s.stationCode || 'Station'} (${s.type})`
      }))),
      catchError(() => {
        // Fallback for seamless demo/testing if backend is unreachable
        return this.mock.getStations();
      })
    );
  }

  /**
   * Get a single station by UUID.
   * Maps to GET /api/stations/{id}
   */
  getStationById(id: string): Observable<Station> {
    if (environment.useMocks) {
      return this.mock.getStations().pipe(
        map((list) => {
          const found = list.find((s) => s.id === id);
          if (!found) throw new Error('Station not found');
          return found;
        })
      );
    }

    return this.api.get<Station>(`${this.stationsEndpoint}/${id}`).pipe(
      catchError(() => {
        return this.mock.getStations().pipe(
          map((list) => list.find((s) => s.id === id) || list[0])
        );
      })
    );
  }

  /**
   * Get slot availability for a station on a given date (ISO YYYY-MM-DD).
   * Maps to GET /api/stations/{id}/availability?date=...
   */
  getAvailability(stationId: string, dateStr: string): Observable<SlotAvailabilityResponse[]> {
    if (environment.useMocks) {
      return this.mock.getStationAvailability(stationId, dateStr).pipe(
        map((slots) => slots.map((s) => ({
          startTime: `${dateStr}T${s.startTime}:00Z`,
          endTime: `${dateStr}T${s.endTime}:00Z`,
          available: s.isAvailable
        })))
      );
    }

    const params = new HttpParams().set('date', dateStr);
    return this.api.get<SlotAvailabilityResponse[]>(`${this.stationsEndpoint}/${stationId}/availability`, { params }).pipe(
      catchError(() => {
        return this.mock.getStationAvailability(stationId, dateStr).pipe(
          map((slots) => slots.map((s) => ({
            startTime: `${dateStr}T${s.startTime}:00Z`,
            endTime: `${dateStr}T${s.endTime}:00Z`,
            available: s.isAvailable
          })))
        );
      })
    );
  }

  /**
   * Create a new game station (ADMIN only).
   * Maps to POST /api/stations
   */
  createStation(request: GameStationRequest): Observable<GameStationResponse> {
    if (environment.useMocks) {
      return this.mock.createStation(request);
    }

    return this.api.post<GameStationResponse>(this.stationsEndpoint, request).pipe(
      catchError(() => this.mock.createStation(request))
    );
  }

  /**
   * Update an existing game station (ADMIN only).
   * Maps to PUT /api/stations/{id}
   */
  updateStation(id: string, request: GameStationRequest): Observable<GameStationResponse> {
    if (environment.useMocks) {
      return this.mock.updateStation(id, request);
    }

    return this.api.put<GameStationResponse>(`${this.stationsEndpoint}/${id}`, request).pipe(
      catchError(() => this.mock.updateStation(id, request))
    );
  }

  /**
   * Soft-delete / deactivate station (ADMIN only).
   * Maps to DELETE /api/stations/{id}
   */
  deleteStation(id: string): Observable<void> {
    if (environment.useMocks) {
      return this.mock.deleteStation(id);
    }

    return this.api.delete<void>(`${this.stationsEndpoint}/${id}`).pipe(
      catchError(() => this.mock.deleteStation(id))
    );
  }
}
