import { Injectable, inject } from '@angular/core';
import { Observable, catchError, of, map } from 'rxjs';
import { ApiService } from './api.service';
import { MockDataService } from './mock/mock-data.service';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';
import {
  Station,
  StationType,
  SlotAvailability,
  Game,
  BookingRequest,
  BookingResponse,
  BookingStatus,
  LoyaltyBalanceDto
} from '../../shared/models';

export interface BackendStationResponse {
  id: string;
  stationCode: string;
  type: string;
  hourlyRate: number;
  active: boolean;
  name?: string;
  imageUrl?: string;
}

export interface BackendSlotResponse {
  startTime: string;
  endTime: string;
  available?: boolean;
  isAvailable?: boolean;
}

export interface BackendGameResponse {
  id: string;
  title: string;
  genre?: string;
  platforms?: string[];
  coverUrl?: string;
  featured?: boolean;
  active?: boolean;
  maxPlayers?: number;
  ageRating?: string;
  description?: string;
  releaseYear?: number;
}

export interface BackendBookingResponse {
  id: string;
  userId: string;
  stationId: string;
  stationCode?: string;
  gameId?: string;
  startTime: string;
  endTime: string;
  status: string;
  source?: string;
  paymentId?: string;
  totalAmount?: number;
  discountAmount?: number;
  payableAmount?: number;
  createdAt?: string;
}

const GAME_COVER_PLACEHOLDER = '/assets/images/ps5_console_01.jpg';

@Injectable({ providedIn: 'root' })
export class BookingService {
  private readonly api = inject(ApiService);
  private readonly mockData = inject(MockDataService);
  private readonly auth = inject(AuthService);

  private readonly uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  // ─── Stations ────────────────────────────────────────────────────────────────

  getStations(): Observable<Station[]> {
    if (environment.useMocks) {
      return this.mockData.getStations();
    }
    return this.api.get<BackendStationResponse[]>('/stations').pipe(
      map((backendStations) => {
        if (!backendStations || !Array.isArray(backendStations) || backendStations.length === 0) {
          return [];
        }
        return backendStations.map((st, idx) => this.mapStation(st, idx));
      }),
      catchError(() => this.mockData.getStations())
    );
  }

  private mapStation(st: BackendStationResponse, idx: number): Station {
    const isConsole = st.type === 'CONSOLE' || st.stationCode?.startsWith('CONSOLE');
    const isVr = st.type === 'VR' || st.stationCode?.startsWith('VR');
    const isPc = st.type === 'PC' || st.stationCode?.startsWith('PC');

    let name = st.name;
    if (!name) {
      if (isConsole) name = `PS5 ${st.stationCode || 'CONSOLE ' + (idx + 1)}`;
      else if (isPc) name = `GAMING ${st.stationCode || 'PC ' + (idx + 1)}`;
      else if (isVr) name = `VR ${st.stationCode || 'STATION ' + (idx + 1)}`;
      else name = st.stationCode || `STATION ${idx + 1}`;
    }

    let imageUrl = st.imageUrl;
    if (!imageUrl) {
      if (isConsole) {
        imageUrl = idx % 2 === 0 ? '/assets/images/ps5_console_01.jpg' : '/assets/images/ps5_console_02.jpg';
      } else if (isVr) {
        imageUrl = '/assets/images/ps5_console_02.jpg';
      } else {
        imageUrl = '/assets/images/ps5_console_01.jpg';
      }
    }

    const stationNum = parseInt(st.stationCode?.replace(/\D/g, '') || String(idx + 1), 10);

    return {
      id: st.id,
      stationNumber: stationNum,
      stationCode: st.stationCode || `ST-0${idx + 1}`,
      name,
      type: (isConsole ? 'PS5' : (isPc ? 'PC_ESPORTS' : 'PS5')) as StationType,
      hourlyRate: Number(st.hourlyRate || 400),
      imageUrl,
      specifications: isConsole
        ? 'PlayStation 5 • 4K 120Hz OLED • DualSense Wireless'
        : (isVr ? 'Meta Quest Pro 4K VR Rig' : 'RTX 4080 • 240Hz Esports Rig'),
      controllersCount: isConsole ? 2 : 1,
      active: st.active !== false
    } as Station;
  }

  // ─── Games ───────────────────────────────────────────────────────────────────

  /** GET /stations/{stationId}/games — returns only active games on that station */
  getStationGames(stationId: string): Observable<Game[]> {
    if (environment.useMocks) {
      return this.mockData.getStationGames(stationId);
    }
    return this.api.get<BackendGameResponse[]>(`/stations/${stationId}/games`).pipe(
      map((games) => {
        if (!games || !Array.isArray(games)) return [];
        return games
          .filter((g) => g.active !== false)
          .map((g) => this.mapGame(g));
      }),
      catchError(() => this.mockData.getStationGames(stationId))
    );
  }

  /** GET /games?active=true — all active games (optionally featured) */
  getGames(options?: { featured?: boolean }): Observable<Game[]> {
    if (environment.useMocks) {
      return this.mockData.getGames();
    }
    const params: Record<string, string> = { active: 'true' };
    if (options?.featured) {
      params['featured'] = 'true';
    }
    return this.api.get<BackendGameResponse[]>('/games', { params }).pipe(
      map((games) => {
        if (!games || !Array.isArray(games)) return [];
        return games
          .filter((g) => g.active !== false)
          .map((g) => this.mapGame(g));
      }),
      catchError(() => this.mockData.getGames())
    );
  }

  /** GET /games/{id}/stations — find stations that have a specific game */
  getGameStations(gameId: string): Observable<Station[]> {
    if (environment.useMocks || !gameId) {
      return this.mockData.getStations();
    }
    return this.api.get<BackendStationResponse[]>(`/games/${gameId}/stations`).pipe(
      map((stations) => {
        if (!stations || !Array.isArray(stations)) return [];
        return stations.map((st, idx) => this.mapStation(st, idx));
      }),
      catchError(() => this.mockData.getStations())
    );
  }

  private mapGame(g: BackendGameResponse): Game {
    return {
      id: g.id,
      title: g.title,
      genre: g.genre,
      coverImage: g.coverUrl || GAME_COVER_PLACEHOLDER,
      platforms: g.platforms,
      ageRating: g.ageRating,
      maxPlayers: g.maxPlayers,
      featured: g.featured,
      active: g.active
    };
  }

  // ─── Availability ─────────────────────────────────────────────────────────────

  getStationAvailability(stationId: string, date: string): Observable<SlotAvailability[]> {
    if (environment.useMocks || !this.uuidRegex.test(stationId)) {
      return this.mockData.getStationAvailability(stationId, date);
    }
    return this.api.get<BackendSlotResponse[]>(`/stations/${stationId}/availability`, {
      params: { date }
    }).pipe(
      map((backendSlots) => {
        if (!backendSlots || !Array.isArray(backendSlots) || backendSlots.length === 0) {
          return [];
        }
        return backendSlots.map((s) => ({
          stationId,
          date,
          startTime: s.startTime,
          endTime: s.endTime,
          isAvailable: s.available ?? s.isAvailable ?? true,
          price: 0
        }));
      }),
      catchError(() => this.mockData.getStationAvailability(stationId, date))
    );
  }

  // ─── Loyalty ─────────────────────────────────────────────────────────────────

  getLoyaltyBalance(): Observable<LoyaltyBalanceDto> {
    const user = this.auth.currentUser();
    const userId = user?.sub || 'usr-customer-1';
    if (environment.useMocks) {
      return this.mockData.getLoyaltyBalance(userId);
    }
    return this.api.get<LoyaltyBalanceDto>(`/loyalty/balance/${userId}`).pipe(
      catchError(() => this.mockData.getLoyaltyBalance(userId))
    );
  }

  // ─── Bookings ─────────────────────────────────────────────────────────────────

  createBooking(request: BookingRequest): Observable<BookingResponse> {
    if (environment.useMocks || !this.uuidRegex.test(request.stationId)) {
      return this.mockData.createBooking({
        stationId: request.stationId,
        gameId: request.gameId,
        bookingDate: request.bookingDate,
        startTime: request.startTime,
        endTime: request.endTime
      });
    }

    // Format ISO Instants for backend BookingRequest
    let startIso: string;
    let endIso: string;

    if (request.startTime && request.startTime.includes('T')) {
      startIso = new Date(request.startTime).toISOString();
    } else {
      startIso = new Date(`${request.bookingDate}T${request.startTime}:00+05:30`).toISOString();
    }

    if (request.endTime && request.endTime.includes('T')) {
      endIso = new Date(request.endTime).toISOString();
    } else {
      endIso = new Date(`${request.bookingDate}T${request.endTime}:00+05:30`).toISOString();
    }

    // Backend @Future validation: startTime must be strictly in the future.
    const now = new Date();
    const startDate = new Date(startIso);
    const endDate = new Date(endIso);

    if (startDate.getTime() <= now.getTime()) {
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      const newStart = new Date(startDate.getTime());
      newStart.setFullYear(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate());

      if (newStart.getTime() <= now.getTime()) {
        newStart.setDate(newStart.getDate() + 1);
      }

      const durationMs = Math.max(3600000, endDate.getTime() - startDate.getTime());
      const newEnd = new Date(newStart.getTime() + durationMs);

      startIso = newStart.toISOString();
      endIso = newEnd.toISOString();
    }

    const backendPayload = {
      stationId: request.stationId,
      gameId: request.gameId, // always send gameId
      startTime: startIso,
      endTime: endIso,
      paymentMethod: request.paymentMethod || 'CARD',
      loyaltyPointsToRedeem: request.pointsToRedeem || 0
    };

    return this.api.post<BackendBookingResponse>('/bookings', backendPayload).pipe(
      map((res: BackendBookingResponse) => ({
        id: res.id,
        bookingReference: 'GC-' + (res.id ? res.id.substring(0, 8).toUpperCase() : Math.floor(Math.random() * 900000 + 100000)),
        userId: res.userId,
        stationId: res.stationId,
        stationName: res.stationCode ? `PS5 ${res.stationCode}` : (request.stationId || 'CONSOLE-01'),
        gameId: res.gameId || request.gameId,
        bookingDate: res.startTime ? res.startTime.split('T')[0] : request.bookingDate,
        startTime: res.startTime ? new Date(res.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : request.startTime,
        endTime: res.endTime ? new Date(res.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : request.endTime,
        totalAmount: Number(res.totalAmount ?? 0),
        discountAmount: Number(res.discountAmount ?? 0),
        finalAmount: Number(res.payableAmount ?? res.totalAmount ?? 0),
        status: (res.status || 'CONFIRMED') as BookingStatus,
        createdAt: res.createdAt || new Date().toISOString()
      }))
    );
  }

  getMyBookings(): Observable<BookingResponse[]> {
<<<<<<< Updated upstream
    if (environment.useMocks) {
      return of([]);
    }
    return this.api.get<BookingResponse[]>('/bookings/mine').pipe(
      catchError(() => of([]))
    );
  }
=======
    return this.api.get<BackendBookingResponse[]>('/bookings/mine').pipe(
      map((list) => {
        if (!list || !Array.isArray(list)) return [];
        return list.map((res) => this.mapBookingItem(res));
      }),
      catchError(() => of([]))
    );
  }

  rescheduleBooking(
    bookingId: string,
    request: RescheduleBookingRequest
  ): Observable<BookingResponse> {
    if (environment.useMocks) {
      return this.mockData.rescheduleBooking(bookingId, request);
    }

    let startIso: string;
    let endIso: string;

    if (request.startTime && request.startTime.includes('T')) {
      startIso = new Date(request.startTime).toISOString();
    } else {
      startIso = new Date(`${request.bookingDate}T${request.startTime}:00+05:30`).toISOString();
    }

    if (request.endTime && request.endTime.includes('T')) {
      endIso = new Date(request.endTime).toISOString();
    } else {
      endIso = new Date(`${request.bookingDate}T${request.endTime}:00+05:30`).toISOString();
    }

    const payload = {
      stationId: request.stationId,
      ...(request.gameId ? { gameId: request.gameId } : {}),
      startTime: startIso,
      endTime: endIso
    };

    return this.api.patch<BackendBookingResponse>(`/bookings/${bookingId}/reschedule`, payload).pipe(
      map((res: BackendBookingResponse) => this.mapBookingItem(res, 'CONFIRMED')),
      catchError((error: unknown) => {
        const mappedError = ErrorMapper.map(error);
        const errObj = error as Record<string, unknown> | null;
        const serverError = errObj && typeof errObj['error'] === 'object' && errObj['error'] !== null
          ? (errObj['error'] as Record<string, unknown>)
          : null;
        const fallbackRaw = serverError ? (serverError['error'] as string | undefined) : undefined;
        const rawCode = mappedError.code ||
          (typeof fallbackRaw === 'string' && /^[A-Z0-9_]+$/.test(fallbackRaw) ? fallbackRaw : undefined);
        const code = rawCode || 'UNKNOWN_ERROR';

        return throwError(() => ({ ...mappedError, code } as ApiError));
      })
    );
  }

  private mapBookingItem(res: BackendBookingResponse, fallbackStatus: BookingStatus = 'CONFIRMED'): BookingResponse {
    const item: BookingResponse = {
      id: res.id,
      bookingReference: res.bookingReference || `GC-${res.id ? String(res.id).substring(0, 8).toUpperCase() : 'BK'}`,
      userId: res.userId,
      stationId: res.stationId,
      stationName: res.stationName || (res.stationCode ? `PS5 ${res.stationCode}` : 'PS5 Station'),
      bookingDate: res.bookingDate || (res.startTime && String(res.startTime).includes('T') ? String(res.startTime).split('T')[0] : ''),
      startTime: res.startTime,
      endTime: res.endTime,
      totalAmount: Number(res.totalAmount ?? 0),
      discountAmount: Number(res.discountAmount ?? 0),
      finalAmount: Number(res.finalAmount ?? res.payableAmount ?? res.totalAmount ?? 0),
      status: (res.status || fallbackStatus) as BookingStatus,
      createdAt: res.createdAt || ''
    };
    if (res.gameId) item.gameId = res.gameId;
    if (res.gameTitle) item.gameTitle = res.gameTitle;
    return item;
  }

  cancelBooking(bookingId: string): Observable<BookingResponse> {
    if (environment.useMocks) {
      return this.mockData.cancelBooking(bookingId);
    }

    return this.api.patch<BackendBookingResponse>(`/bookings/${bookingId}/cancel`).pipe(
      map((res: BackendBookingResponse) => this.mapBookingItem(res, 'CANCELLED')),
      catchError((error: unknown) => {
        const mappedError = ErrorMapper.map(error);
        const errObj = error as Record<string, unknown> | null;
        const serverError = errObj && typeof errObj['error'] === 'object' && errObj['error'] !== null
          ? (errObj['error'] as Record<string, unknown>)
          : null;
        const fallbackRaw = serverError ? (serverError['error'] as string | undefined) : undefined;
        const rawCode = mappedError.code ||
          (typeof fallbackRaw === 'string' && /^[A-Z0-9_]+$/.test(fallbackRaw) ? fallbackRaw : undefined);
        const code = rawCode || 'UNKNOWN_ERROR';

        return throwError(() => ({ ...mappedError, code } as ApiError));
      })
    );
  }
>>>>>>> Stashed changes
}
