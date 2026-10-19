import { Injectable } from '@angular/core';

/**
 * @deprecated All mock data has been deleted for production readiness.
 * The application connects directly to the backend microservices using original database records.
 */
@Injectable({ providedIn: 'root' })
export class MockDataService {
  // Mock data deleted. Original data from live backend microservices is used exclusively.
  [key: string]: any;
  getAdminBookingStats(..._args: any[]): any { return null; }
  getAdminPaymentStats(..._args: any[]): any { return null; }
  getAdminUserStats(..._args: any[]): any { return null; }
  getAdminTournamentStats(..._args: any[]): any { return null; }
  getAdminRecentBookings(..._args: any[]): any { return null; }
  getStations(..._args: any[]): any { return null; }
  getStationGames(..._args: any[]): any { return null; }
  getStationAvailability(..._args: any[]): any { return null; }
  getGames(..._args: any[]): any { return null; }
  getLoyaltyBalance(..._args: any[]): any { return null; }
  createBooking(..._args: any[]): any { return null; }
  getTournaments(..._args: any[]): any { return null; }
  getTournamentById(..._args: any[]): any { return null; }
}
