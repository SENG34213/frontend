import { Injectable } from '@angular/core';
import { Observable, of, delay } from 'rxjs';
import {
  Station,
  SlotAvailability,
  TournamentDto,
  LoyaltyBalanceDto,
  BookingResponse
} from '../../../shared/models';

@Injectable({ providedIn: 'root' })
export class MockDataService {
  private readonly stations: Station[] = [
    {
      id: 'st-01',
      stationNumber: 1,
      name: 'PlayStation 5 Pro Lounge #01',
      type: 'PS5',
      hourlyRate: 650,
      specifications: '4K 120Hz OLED, 2x DualSense Edge',
      active: true
    },
    {
      id: 'st-02',
      stationNumber: 2,
      name: 'PlayStation 5 Pro Lounge #02',
      type: 'PS5',
      hourlyRate: 650,
      specifications: '4K 120Hz OLED, 2x DualSense Edge',
      active: true
    },
    {
      id: 'st-03',
      stationNumber: 3,
      name: 'Xbox Series X Combat Rig',
      type: 'XBOX_SERIES_X',
      hourlyRate: 600,
      specifications: 'Dolby Atmos, Xbox Elite Wireless Controller',
      active: true
    },
    {
      id: 'st-04',
      stationNumber: 4,
      name: 'PC Esports Arena Rig #04',
      type: 'PC_ESPORTS',
      hourlyRate: 800,
      specifications: 'RTX 4090, i9-14900K, 240Hz Zowie XL2546K',
      active: true
    }
  ];

  private readonly tournaments: TournamentDto[] = [
    {
      id: 'tourn-01',
      title: 'Colombo FC 25 Championship',
      gameTitle: 'EA Sports FC 25',
      description: 'Annual 1v1 console tournament with knockout brackets.',
      startDate: new Date(Date.now() + 86400000 * 3).toISOString(),
      registrationDeadline: new Date(Date.now() + 86400000 * 2).toISOString(),
      maxParticipants: 32,
      currentParticipants: 18,
      entryFee: 1500,
      status: 'REGISTRATION_OPEN'
    },
    {
      id: 'tourn-02',
      title: 'Valorant Colombo Masters',
      gameTitle: 'Valorant',
      description: '5v5 tactical shooter LAN tournament at Gaming Castle Arena.',
      startDate: new Date(Date.now() + 86400000 * 7).toISOString(),
      registrationDeadline: new Date(Date.now() + 86400000 * 5).toISOString(),
      maxParticipants: 16,
      currentParticipants: 16,
      entryFee: 5000,
      status: 'IN_PROGRESS'
    }
  ];

  getStations(): Observable<Station[]> {
    return of(this.stations).pipe(delay(200));
  }

  getStationAvailability(stationId: string, date: string): Observable<SlotAvailability[]> {
    const slots: SlotAvailability[] = [];
    const times = [
      ['10:00', '11:00'],
      ['11:00', '12:00'],
      ['12:00', '13:00'],
      ['13:00', '14:00'],
      ['14:00', '15:00'],
      ['15:00', '16:00'],
      ['16:00', '17:00'],
      ['17:00', '18:00'],
      ['18:00', '19:00'],
      ['19:00', '20:00']
    ];

    times.forEach(([startTime, endTime], index) => {
      // Simulate slot #3 being occupied for wireframe realism
      const isAvailable = index !== 2 && index !== 6;
      slots.push({
        stationId,
        date,
        startTime,
        endTime,
        isAvailable,
        price: 650
      });
    });

    return of(slots).pipe(delay(150));
  }

  getTournaments(): Observable<TournamentDto[]> {
    return of(this.tournaments).pipe(delay(200));
  }

  getLoyaltyBalance(userId: string): Observable<LoyaltyBalanceDto> {
    return of({
      userId,
      pointsBalance: 1250,
      tier: 'GOLD',
      equivalentDiscountLkr: 1250
    }).pipe(delay(150));
  }

  createBooking(booking: Partial<BookingResponse>): Observable<BookingResponse> {
    const created: BookingResponse = {
      id: 'bk-' + Math.floor(Math.random() * 90000 + 10000),
      bookingReference: 'GC-' + Math.floor(Math.random() * 900000 + 100000),
      userId: booking.userId || 'usr-1',
      stationId: booking.stationId || 'st-01',
      stationName: booking.stationName || 'PlayStation 5 Pro Lounge #01',
      bookingDate: booking.bookingDate || new Date().toISOString().split('T')[0],
      startTime: booking.startTime || '18:00',
      endTime: booking.endTime || '20:00',
      totalAmount: 1300,
      finalAmount: 1300,
      status: 'CONFIRMED',
      createdAt: new Date().toISOString()
    };
    return of(created).pipe(delay(300));
  }
}
