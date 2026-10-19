/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

/**
 * @deprecated All mock data has been deleted for production readiness.
 * The application connects directly to the backend microservices using original database records.
 */
@Injectable({ providedIn: 'root' })
export class MockDataService {
  // Mock data deleted. Original data from live backend microservices is used exclusively.
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

  getLoyaltyBalance(..._args: any[]): Observable<any> {
    return of(null);
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
}
