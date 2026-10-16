import { Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, of, delay, throwError } from 'rxjs';
import {
  Station,
  Game,
  SlotAvailability,
  TournamentDto,
  LoyaltyBalanceDto,
  BookingResponse,
  AuthResponse,
  LoginRequest,
  PhoneLoginRequest,
  RegisterRequest,
  ResetPasswordRequest,
  UserRole
} from '../../../shared/models';

function createMockJwt(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = btoa(JSON.stringify(payload));
  return `${header}.${body}.mock-signature`;
}

@Injectable({ providedIn: 'root' })
export class MockDataService {
  private readonly mockUsers: {
    id: string;
    email: string;
    phoneNumber?: string;
    password: string;
    fullName: string;
    role: UserRole;
  }[] = [
    {
      id: 'usr-customer-1',
      email: 'player@gamingcastle.lk',
      phoneNumber: '0771234567',
      password: 'password123',
      fullName: 'Kasun Perera',
      role: 'CUSTOMER'
    },
    {
      id: 'usr-admin-1',
      email: 'admin@gamingcastle.lk',
      phoneNumber: '0779876543',
      password: 'adminPassword123',
      fullName: 'Admin User',
      role: 'ADMIN'
    }
  ];

  private readonly stations: Station[] = [
    {
      id: 'st-01',
      stationNumber: 1,
      stationCode: 'PS5-01',
      name: 'PS5 CONSOLE 01',
      type: 'PS5',
      hourlyRate: 500,
      specifications: 'Ultra-High Speed SSD, DualSense™ Wireless Controller',
      controllersCount: 4,
      imageUrl: '/assets/images/ps5_console_01.jpg',
      active: true
    },
    {
      id: 'st-02',
      stationNumber: 2,
      stationCode: 'PS5-02',
      name: 'PS5 CONSOLE 02',
      type: 'PS5',
      hourlyRate: 500,
      specifications: '4K-TV Gaming, Up to 120fps with 120Hz Output',
      controllersCount: 4,
      imageUrl: '/assets/images/ps5_console_02.jpg',
      active: true
    },
    {
      id: 'st-03',
      stationNumber: 3,
      stationCode: 'XB-01',
      name: 'Xbox Series X Combat Rig',
      type: 'XBOX_SERIES_X',
      hourlyRate: 500,
      specifications: 'Dolby Atmos, Xbox Elite Wireless Controller',
      controllersCount: 2,
      imageUrl: '/assets/images/ps5_console_01.jpg',
      active: true
    },
    {
      id: 'st-04',
      stationNumber: 4,
      stationCode: 'PC-01',
      name: 'PC Esports Arena Rig #04',
      type: 'PC_ESPORTS',
      hourlyRate: 800,
      specifications: 'RTX 4090, i9-14900K, 240Hz Zowie XL2546K',
      controllersCount: 1,
      imageUrl: '/assets/images/ps5_console_02.jpg',
      active: true
    }
  ];

  private readonly games: Game[] = [
    {
      id: 'game-01',
      title: 'CYBERPUNK 2077',
      genre: 'Action RPG',
      coverImage: '/assets/images/game_cyberpunk.jpg'
    },
    {
      id: 'game-02',
      title: 'GRAN TURISMO 7',
      genre: 'Racing Sim',
      coverImage: '/assets/images/game_granturismo.jpg'
    },
    {
      id: 'game-03',
      title: 'ELDEN RING',
      genre: 'Action RPG',
      coverImage: '/assets/images/game_eldenring.jpg'
    },
    {
      id: 'game-04',
      title: 'TEKKEN 8',
      genre: 'Fighting',
      coverImage: '/assets/images/game_tekken.jpg'
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

  mockLogin(request: LoginRequest): Observable<AuthResponse> {
    const email = request.email.trim().toLowerCase();
    const user = this.mockUsers.find((u) => u.email.toLowerCase() === email);

    if (!user || user.password !== request.password) {
      return throwError(
        () =>
          new HttpErrorResponse({
            status: 401,
            error: {
              error: 'INVALID_CREDENTIALS',
              message: 'Invalid email or password'
            }
          })
      );
    }

    const nowSeconds = Math.floor(Date.now() / 1000);
    const token = createMockJwt({
      sub: user.id,
      userId: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      iat: nowSeconds,
      exp: nowSeconds + 86400
    });

    return of<AuthResponse>({
      accessToken: token,
      tokenType: 'Bearer',
      userId: user.id,
      email: user.email,
      role: user.role
    }).pipe(delay(200));
  }

  mockPhoneLogin(request: PhoneLoginRequest): Observable<AuthResponse> {
    const cleanPhone = request.phoneNumber.trim().replace(/[\s-]/g, '');
    const user = this.mockUsers.find(
      (u) => u.phoneNumber?.replace(/[\s-]/g, '') === cleanPhone
    );

    if (!user || user.password !== request.password) {
      return throwError(
        () =>
          new HttpErrorResponse({
            status: 401,
            error: {
              error: 'INVALID_CREDENTIALS',
              message: 'Invalid phone number or password'
            }
          })
      );
    }

    const nowSeconds = Math.floor(Date.now() / 1000);
    const token = createMockJwt({
      sub: user.id,
      userId: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      iat: nowSeconds,
      exp: nowSeconds + 86400
    });

    return of<AuthResponse>({
      accessToken: token,
      tokenType: 'Bearer',
      userId: user.id,
      email: user.email,
      role: user.role
    }).pipe(delay(200));
  }

  mockRegister(request: RegisterRequest): Observable<AuthResponse> {
    const email = request.email.trim().toLowerCase();
    if (this.mockUsers.some((u) => u.email.toLowerCase() === email)) {
      return throwError(
        () =>
          new HttpErrorResponse({
            status: 409,
            error: {
              error: 'EMAIL_TAKEN',
              message: 'Email already exists'
            }
          })
      );
    }

    if (request.phoneNumber) {
      const cleanPhone = request.phoneNumber.trim().replace(/[\s-]/g, '');
      if (
        this.mockUsers.some(
          (u) => u.phoneNumber && u.phoneNumber.replace(/[\s-]/g, '') === cleanPhone
        )
      ) {
        return throwError(
          () =>
            new HttpErrorResponse({
              status: 409,
              error: {
                error: 'PHONE_TAKEN',
                message: 'Phone number already exists'
              }
            })
        );
      }
    }

    const newUser = {
      id: 'usr-' + Date.now(),
      email,
      phoneNumber: request.phoneNumber?.trim(),
      password: request.password,
      fullName: request.fullName.trim(),
      role: 'CUSTOMER' as UserRole
    };
    this.mockUsers.push(newUser);

    const nowSeconds = Math.floor(Date.now() / 1000);
    const token = createMockJwt({
      sub: newUser.id,
      userId: newUser.id,
      email: newUser.email,
      fullName: newUser.fullName,
      role: newUser.role,
      iat: nowSeconds,
      exp: nowSeconds + 86400
    });

    return of<AuthResponse>({
      accessToken: token,
      tokenType: 'Bearer',
      userId: newUser.id,
      email: newUser.email,
      role: newUser.role,
      notificationSent: true
    }).pipe(delay(200));
  }

  mockForgotPassword(identifier: string): Observable<void> {
    void identifier;
    // Per backend API contract (FR-04/FR-05): always responds 202 to avoid user enumeration
    return of(void 0).pipe(delay(200));
  }

  mockResetPassword(request: ResetPasswordRequest): Observable<void> {
    if (request.code !== '123456') {
      return throwError(
        () =>
          new HttpErrorResponse({
            status: 400,
            error: {
              error: 'INVALID_RESET_CODE',
              message: 'The reset code is invalid or has expired'
            }
          })
      );
    }

    const rawId = request.identifier.trim().toLowerCase();
    const cleanPhone = request.identifier.trim().replace(/[\s-]/g, '');
    const user = this.mockUsers.find(
      (u) =>
        u.email.toLowerCase() === rawId ||
        (u.phoneNumber && u.phoneNumber.replace(/[\s-]/g, '') === cleanPhone)
    );

    if (user) {
      user.password = request.newPassword;
    }

    return of(void 0).pipe(delay(200));
  }

  getStations(): Observable<Station[]> {
    return of(this.stations).pipe(delay(200));
  }

  getAvailableStations(): Observable<Station[]> {
    return of(this.stations.filter((s) => s.active)).pipe(delay(150));
  }

  getGames(): Observable<Game[]> {
    return of(this.games).pipe(delay(100));
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
    return of<LoyaltyBalanceDto>({
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
