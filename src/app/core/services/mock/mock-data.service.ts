/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable } from '@angular/core';
import { Observable, of, delay } from 'rxjs';
import {
  LoyaltyBalanceDto,
  BookingResponse,
  UserRole,
  LoyaltyTransactionDto,
  UserProfile
} from '../../../shared/models';

/**
 * @deprecated Production data comes from backend services. This service provides minimal fallback
 * data for customer-facing views when mock mode is explicitly enabled.
 */
@Injectable({ providedIn: 'root' })
export class MockDataService {
  [key: string]: any;

  getAdminBookingStats(..._args: any[]): Observable<any> {
    return of(null);
  }

  getAdminPaymentStats(..._args: any[]): Observable<any> {
    return of(null);
  }

  getAdminUserStats(..._args: any[]): Observable<any> {
    return of(null);
  }

  getAdminTournamentStats(..._args: any[]): Observable<any> {
    return of(null);
  }

  getAdminRecentBookings(..._args: any[]): Observable<any> {
    return of(null);
  }

  getStations(..._args: any[]): Observable<any> {
    return of(null);
  }

  getStationGames(..._args: any[]): Observable<any> {
    return of(null);
  }

  getStationAvailability(..._args: any[]): Observable<any> {
    return of(null);
  }

  getGames(..._args: any[]): Observable<any> {
    return of(null);
  }

  getLoyaltyBalance(userId = ''): Observable<LoyaltyBalanceDto> {
    return of({
      userId,
      pointsBalance: 0,
      tier: 'BRONZE',
      equivalentDiscountLkr: 0
    });
  }

  createBooking(..._args: any[]): Observable<any> {
    return of(null);
  }

  getTournaments(..._args: any[]): Observable<any> {
    return of(null);
  }

  getTournamentById(..._args: any[]): Observable<any> {
    return of(null);
  }

  rescheduleBooking(
    bookingId: string,
    request: { stationId: string; gameId: string; startTime: string; endTime: string; bookingDate?: string }
  ): Observable<BookingResponse> {
    const res: BookingResponse = {
      id: bookingId,
      bookingReference: 'GC-' + (bookingId ? bookingId.substring(0, 8).toUpperCase() : 'RESCHED'),
      userId: 'usr-customer-1',
      stationId: request.stationId,
      stationName: 'PS5 Lounge #01',
      gameId: request.gameId,
      gameTitle: 'EA SPORTS FC 25',
      bookingDate: request.bookingDate || (request.startTime.includes('T') ? request.startTime.split('T')[0] : '2026-10-25'),
      startTime: request.startTime,
      endTime: request.endTime,
      totalAmount: 1000,
      discountAmount: 0,
      finalAmount: 1000,
      status: 'CONFIRMED',
      createdAt: new Date().toISOString()
    };
    return of(res).pipe(delay(150));
  }

  getUserProfile(userId?: string): Observable<UserProfile> {
    const uid = userId || 'usr-customer-1';
    return of({
      id: uid,
      email: 'player@gamingcastle.lk',
      fullName: 'Kasun Perera',
      phoneNumber: '+94771234567',
      role: 'CUSTOMER' as UserRole,
      active: true,
      enabled: true,
      createdAt: '2026-09-02T10:00:00Z'
    }).pipe(delay(150));
  }

  getMyLoyaltyHistory(
    userId?: string,
    page = 0,
    size = 10
  ): Observable<{ content: LoyaltyTransactionDto[]; totalElements: number; totalPages: number; number: number; size: number }> {
    void userId;
    const items: LoyaltyTransactionDto[] = [];
    const start = page * size;
    const paged = items.slice(start, start + size);
    return of({
      content: paged,
      totalElements: items.length,
      totalPages: Math.max(1, Math.ceil(items.length / size)),
      number: page,
      size
    }).pipe(delay(150));
  }

  getMyCustomerBookings(): Observable<BookingResponse[]> {
    const list: BookingResponse[] = [
      {
        id: 'bk-upcoming-1',
        bookingReference: 'GC-UP1001',
        userId: 'usr-customer-1',
        stationId: 'st-01',
        stationName: 'PS5 Lounge #01',
        gameId: 'game-01',
        gameTitle: 'EA SPORTS FC 25',
        bookingDate: '2026-10-25',
        startTime: '18:00',
        endTime: '20:00',
        totalAmount: 1000,
        finalAmount: 1000,
        status: 'CONFIRMED',
        createdAt: '2026-10-18T10:00:00Z'
      },
      {
        id: 'bk-upcoming-2',
        bookingReference: 'GC-UP1002',
        userId: 'usr-customer-1',
        stationId: 'st-02',
        stationName: 'PS5 Lounge #02',
        gameId: 'game-04',
        gameTitle: 'TEKKEN 8',
        bookingDate: '2026-10-28',
        startTime: '14:00',
        endTime: '16:00',
        totalAmount: 1200,
        finalAmount: 1200,
        status: 'PENDING',
        createdAt: '2026-10-18T11:00:00Z'
      },
      {
        id: 'bk-played-1',
        bookingReference: 'GC-PL2001',
        userId: 'usr-customer-1',
        stationId: 'st-01',
        stationName: 'PS5 Lounge #01',
        gameId: 'game-03',
        gameTitle: 'ELDEN RING',
        bookingDate: '2026-10-10',
        startTime: '17:00',
        endTime: '19:00',
        totalAmount: 1000,
        finalAmount: 1000,
        status: 'COMPLETED',
        createdAt: '2026-10-09T09:00:00Z'
      },
      {
        id: 'bk-played-2',
        bookingReference: 'GC-PL2002',
        userId: 'usr-customer-1',
        stationId: 'st-03',
        stationName: 'VR Rig #01',
        gameId: 'game-02',
        gameTitle: 'GRAN TURISMO 7',
        bookingDate: '2026-10-05',
        startTime: '15:00',
        endTime: '16:00',
        totalAmount: 800,
        finalAmount: 800,
        status: 'CANCELLED',
        createdAt: '2026-10-04T12:00:00Z'
      }
    ];
    return of(list).pipe(delay(150));
  }

  cancelBooking(bookingId: string): Observable<BookingResponse> {
    const res: BookingResponse = {
      id: bookingId,
      bookingReference: 'GC-' + (bookingId ? bookingId.substring(0, 8).toUpperCase() : 'CANCELLED'),
      userId: 'usr-customer-1',
      stationId: 'st-01',
      stationName: 'PS5 Lounge #01',
      gameId: 'game-01',
      gameTitle: 'EA SPORTS FC 25',
      bookingDate: '2026-10-25',
      startTime: '18:00',
      endTime: '20:00',
      totalAmount: 1000,
      discountAmount: 0,
      finalAmount: 1000,
      status: 'CANCELLED',
      createdAt: new Date().toISOString()
    };
    return of(res).pipe(delay(150));
  }
}
