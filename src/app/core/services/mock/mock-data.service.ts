import { Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, of, delay, throwError } from 'rxjs';
import {
  Station,
  Game,
  SlotAvailability,
  GameStationRequest,
  GameStationResponse,
  TournamentDto,
  TournamentResponse,
  TournamentRequest,
  TournamentStatus,
  RegistrationResponse,
  BracketResponse,
  MatchResponse,
  LoyaltyBalanceDto,
  BookingResponse,
  AuthResponse,
  LoginRequest,
  PhoneLoginRequest,
  RegisterRequest,
  ResetPasswordRequest,
  UserRole,
  AdminBookingStatsResponse,
  AdminPaymentStatsResponse,
  AdminUserStatsResponse,
  AdminTournamentStatsResponse,
  AdminBookingRow,
  UserSummaryResponse,
  AdminUpdateUserRequest,
  PagedUsers,
  UserFilter,
  PaymentResponse,
  PagedPayments,
  PaymentFilter,
  PaymentStatus,
  PaymentMethod,
  AdminReportResponse,
  ReportFilter,
  GameTitle,
  CreateGameRequest,
  UpdateGameRequest,
  GameFilter,
  AdminGameStatsResponse,
  LoyaltyRules,
  UpdateLoyaltyRulesRequest,
  AdjustPointsRequest,
  AdminAdjustmentResponse,
  AdminLoyaltyStatsResponse,
  LoyaltyAccountResponse,
  LoyaltyAccountFilter,
  PagedLoyaltyAccounts,
  LoyaltyTransactionDto
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
    enabled: boolean;
    createdAt: string;
    deactivatedBy?: 'USER' | 'ADMIN' | null;
  }[] = [
    {
      id: 'usr-customer-1',
      email: 'player@gamingcastle.lk',
      phoneNumber: '+94771234567',
      password: 'password123',
      fullName: 'Kasun Perera',
      role: 'CUSTOMER',
      enabled: true,
      createdAt: '2026-09-02T10:00:00Z'
    },
    {
      id: 'usr-admin-1',
      email: 'admin@gamingcastle.lk',
      phoneNumber: '+94779876543',
      password: 'adminPassword123',
      fullName: 'Admin User',
      role: 'ADMIN',
      enabled: true,
      createdAt: '2026-09-01T08:30:00Z'
    },
    {
      id: 'usr-customer-2',
      email: 'nimal@gamingcastle.lk',
      phoneNumber: '+94712345678',
      password: 'password123',
      fullName: 'Nimal Silva',
      role: 'CUSTOMER',
      enabled: true,
      createdAt: '2026-09-10T14:20:00Z'
    },
    {
      id: 'usr-customer-3',
      email: 'dinesh.f@gmail.com',
      phoneNumber: '+94765432109',
      password: 'password123',
      fullName: 'Dinesh Fernando',
      role: 'CUSTOMER',
      enabled: false,
      createdAt: '2026-09-12T11:45:00Z',
      deactivatedBy: 'ADMIN'
    },
    {
      id: 'usr-admin-2',
      email: 'sachintha@gamingcastle.lk',
      phoneNumber: '+94781122334',
      password: 'password123',
      fullName: 'Sachintha Gamage',
      role: 'ADMIN',
      enabled: true,
      createdAt: '2026-09-05T09:15:00Z'
    }
  ];

  private readonly stations: Station[] = [
    {
      id: 'st-01',
      stationNumber: 1,
      stationCode: 'PS5-01',
      name: 'PlayStation 5 Pro Lounge #01',
      type: 'CONSOLE',
      hourlyRate: 650,
      specifications: '4K 120Hz OLED, 2x DualSense Edge',
      active: true
    },
    {
      id: 'st-02',
      stationNumber: 2,
      stationCode: 'PS5-02',
      name: 'PlayStation 5 Pro Lounge #02',
      type: 'CONSOLE',
      hourlyRate: 650,
      specifications: '4K 120Hz OLED, 2x DualSense Edge',
      active: true
    },
    {
      id: 'st-03',
      stationNumber: 3,
      stationCode: 'XBOX-03',
      name: 'Xbox Series X Combat Rig',
      type: 'CONSOLE',
      hourlyRate: 600,
      specifications: 'Dolby Atmos, Xbox Elite Wireless Controller',
      controllersCount: 2,
      imageUrl: '/assets/images/ps5_console_01.jpg',
      active: true
    },
    {
      id: 'st-04',
      stationNumber: 4,
      stationCode: 'PC-04',
      name: 'PC Esports Arena Rig #04',
      type: 'PC',
      hourlyRate: 800,
      specifications: 'RTX 4090, i9-14900K, 240Hz Zowie XL2546K',
      controllersCount: 1,
      imageUrl: '/assets/images/ps5_console_02.jpg',
      active: true
    },
    {
      id: 'st-05',
      stationNumber: 5,
      stationCode: 'VR-05',
      name: 'Meta Quest 3 / PS VR2 Sim Rig #05',
      type: 'VR',
      hourlyRate: 1100,
      specifications: 'Direct Drive Wheel + Flight Controls + PSVR2',
      active: true
    },
    {
      id: 'st-06',
      stationNumber: 6,
      stationCode: 'PC-06',
      name: 'PC Esports Arena Rig #06 (Maintenance)',
      type: 'PC',
      hourlyRate: 800,
      specifications: 'RTX 4080, i7-14700K',
      active: false
    }
  ];

  private readonly tournaments: TournamentResponse[] = [
    {
      id: 'tourn-01',
      name: 'Colombo FC 25 Championship',
      title: 'Colombo FC 25 Championship',
      gameTitle: 'EA Sports FC 25',
      description: 'Annual 1v1 console tournament with knockout brackets.',
      startDate: new Date(Date.now() + 86400000 * 3).toISOString(),
      registrationDeadline: new Date(Date.now() + 86400000 * 2).toISOString(),
      maxParticipants: 32,
      participantCount: 18,
      currentParticipants: 18,
      entryFee: 1500,
      status: 'REGISTRATION_OPEN',
      isRegistrationOpen: true,
      createdAt: new Date().toISOString()
    },
    {
      id: 'tourn-02',
      name: 'Valorant Colombo Masters',
      title: 'Valorant Colombo Masters',
      gameTitle: 'Valorant',
      description: '5v5 tactical shooter LAN tournament at Gaming Castle Arena.',
      startDate: new Date(Date.now() + 86400000 * 1).toISOString(),
      registrationDeadline: new Date(Date.now() - 86400000 * 1).toISOString(),
      maxParticipants: 16,
      participantCount: 16,
      currentParticipants: 16,
      entryFee: 5000,
      status: 'ONGOING',
      isRegistrationOpen: false,
      createdAt: new Date().toISOString()
    },
    {
      id: 'tourn-03',
      name: 'Tekken 8 Iron Fist Colombo',
      title: 'Tekken 8 Iron Fist Colombo',
      gameTitle: 'Tekken 8',
      description: 'Double elimination fighting game showdown.',
      startDate: new Date(Date.now() + 86400000 * 14).toISOString(),
      registrationDeadline: new Date(Date.now() + 86400000 * 10).toISOString(),
      maxParticipants: 16,
      participantCount: 4,
      currentParticipants: 4,
      entryFee: 1000,
      status: 'UPCOMING',
      isRegistrationOpen: true,
      createdAt: new Date().toISOString()
    },
    {
      id: 'tourn-04',
      name: 'Apex Legends Trio Clash',
      title: 'Apex Legends Trio Clash',
      gameTitle: 'Apex Legends',
      description: 'Battle Royale trios invitational tournament.',
      startDate: new Date(Date.now() - 86400000 * 10).toISOString(),
      endDate: new Date(Date.now() - 86400000 * 9).toISOString(),
      registrationDeadline: new Date(Date.now() - 86400000 * 12).toISOString(),
      maxParticipants: 20,
      participantCount: 20,
      currentParticipants: 20,
      entryFee: 2500,
      status: 'COMPLETED',
      isRegistrationOpen: false,
      createdAt: new Date().toISOString()
    }
  ];

  private readonly mockBrackets: Record<string, BracketResponse> = {
    'tourn-02': {
      id: 'brk-02',
      tournamentId: 'tourn-02',
      generatedAt: new Date().toISOString(),
      matches: [
        {
          id: 'm-01',
          round: 1,
          participant1Id: 'usr-p1',
          participant1Name: 'Team Liquid LK',
          participant2Id: 'usr-p2',
          participant2Name: 'Viper Esports',
          winnerId: 'usr-p1',
          winnerName: 'Team Liquid LK',
          status: 'COMPLETED'
        },
        {
          id: 'm-02',
          round: 1,
          participant1Id: 'usr-p3',
          participant1Name: 'Colombo Titans',
          participant2Id: 'usr-p4',
          participant2Name: 'Phoenix Legion',
          winnerId: undefined,
          status: 'IN_PROGRESS'
        },
        {
          id: 'm-03',
          round: 2,
          participant1Id: 'usr-p1',
          participant1Name: 'Team Liquid LK',
          participant2Id: undefined,
          winnerId: undefined,
          status: 'SCHEDULED'
        }
      ]
    }
  };

  private readonly mockRegistrations: Record<string, RegistrationResponse[]> = {
    'tourn-01': [
      {
        id: 'reg-01',
        tournamentId: 'tourn-01',
        tournamentName: 'Colombo FC 25 Championship',
        userId: 'usr-customer-1',
        userName: 'Kasun Perera',
        gamerTag: 'Kasun_FC',
        status: 'CONFIRMED',
        paymentId: 'pay-101',
        registeredAt: new Date(Date.now() - 3600000 * 24).toISOString()
      },
      {
        id: 'reg-02',
        tournamentId: 'tourn-01',
        tournamentName: 'Colombo FC 25 Championship',
        userId: 'usr-customer-2',
        userName: 'Nimal Silva',
        gamerTag: 'NimalStriker',
        status: 'CONFIRMED',
        paymentId: 'pay-102',
        registeredAt: new Date(Date.now() - 3600000 * 18).toISOString()
      },
      {
        id: 'reg-03',
        tournamentId: 'tourn-01',
        tournamentName: 'Colombo FC 25 Championship',
        userId: 'usr-customer-3',
        userName: 'Dinesh Fernando',
        gamerTag: 'Dinesh_Gamer',
        status: 'PENDING_PAYMENT',
        registeredAt: new Date(Date.now() - 3600000 * 2).toISOString()
      }
    ]
  };

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
    const normalizePhone = (p?: string) => (p || '').trim().replace(/[\s-]/g, '').replace(/^\+94/, '0');
    const cleanPhone = normalizePhone(request.phoneNumber);
    const user = this.mockUsers.find(
      (u) => normalizePhone(u.phoneNumber) === cleanPhone
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
      role: 'CUSTOMER' as UserRole,
      enabled: true,
      createdAt: new Date().toISOString()
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
    return of([...this.stations]).pipe(delay(200));
  }

  getAvailableStations(): Observable<Station[]> {
    return of(this.stations.filter((s) => s.active)).pipe(delay(150));
  }

  createStation(request: GameStationRequest): Observable<GameStationResponse> {
    const newStation: Station = {
      id: 'st-' + Math.floor(Math.random() * 90000 + 10000),
      stationNumber: this.stations.length + 1,
      stationCode: request.stationCode,
      name: `${request.stationCode} (${request.type})`,
      type: request.type,
      hourlyRate: request.hourlyRate,
      active: request.active
    };
    this.stations.push(newStation);
    return of<GameStationResponse>({
      id: newStation.id,
      stationCode: newStation.stationCode!,
      type: newStation.type,
      hourlyRate: newStation.hourlyRate,
      active: newStation.active
    }).pipe(delay(200));
  }

  updateStation(id: string, request: GameStationRequest): Observable<GameStationResponse> {
    const idx = this.stations.findIndex((s) => s.id === id);
    if (idx !== -1) {
      this.stations[idx] = {
        ...this.stations[idx],
        stationCode: request.stationCode,
        type: request.type,
        hourlyRate: request.hourlyRate,
        active: request.active
      };
    }
    return of<GameStationResponse>({
      id,
      stationCode: request.stationCode,
      type: request.type,
      hourlyRate: request.hourlyRate,
      active: request.active
    }).pipe(delay(200));
  }

  deleteStation(id: string): Observable<void> {
    const idx = this.stations.findIndex((s) => s.id === id);
    if (idx !== -1) {
      this.stations[idx].active = false;
    }
    return of(void 0).pipe(delay(200));
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

  getTournaments(): Observable<TournamentResponse[]> {
    return of([...this.tournaments]).pipe(delay(200));
  }

  getTournamentById(id: string): Observable<TournamentResponse> {
    const t = this.tournaments.find((x) => x.id === id);
    if (!t) return throwError(() => new Error('Tournament not found'));
    return of({ ...t }).pipe(delay(150));
  }

  createTournament(request: TournamentRequest): Observable<TournamentResponse> {
    const newT: TournamentResponse = {
      id: 'tourn-' + Math.floor(Math.random() * 90000 + 10000),
      name: request.name,
      title: request.name,
      gameTitle: request.gameTitle,
      startDate: request.startDate,
      endDate: request.endDate,
      entryFee: request.entryFee,
      maxParticipants: request.maxParticipants,
      participantCount: 0,
      currentParticipants: 0,
      registrationDeadline: request.registrationDeadline,
      status: 'UPCOMING',
      isRegistrationOpen: true,
      createdAt: new Date().toISOString()
    };
    this.tournaments.unshift(newT);
    return of(newT).pipe(delay(200));
  }

  updateTournamentStatus(id: string, status: TournamentStatus): Observable<TournamentResponse> {
    const t = this.tournaments.find((x) => x.id === id);
    if (!t) return throwError(() => new Error('Tournament not found'));
    t.status = status;
    return of({ ...t }).pipe(delay(200));
  }

  cancelTournament(id: string): Observable<TournamentResponse> {
    const t = this.tournaments.find((x) => x.id === id);
    if (!t) return throwError(() => new Error('Tournament not found'));
    t.status = 'CANCELLED';
    return of({ ...t }).pipe(delay(200));
  }

  getTournamentRegistrations(tournamentId: string): Observable<RegistrationResponse[]> {
    const list = this.mockRegistrations[tournamentId] || [
      {
        id: 'reg-demo',
        tournamentId,
        userId: 'usr-customer-1',
        userName: 'Kasun Perera',
        gamerTag: 'KasunLK',
        status: 'CONFIRMED',
        registeredAt: new Date().toISOString()
      }
    ];
    return of(list).pipe(delay(200));
  }

  generateBracket(tournamentId: string): Observable<BracketResponse> {
    const bracket: BracketResponse = {
      id: 'brk-' + Math.floor(Math.random() * 90000 + 10000),
      tournamentId,
      generatedAt: new Date().toISOString(),
      matches: [
        {
          id: 'm-101',
          round: 1,
          participant1Id: 'usr-p1',
          participant1Name: 'Player Alpha',
          participant2Id: 'usr-p2',
          participant2Name: 'Player Beta',
          winnerId: undefined,
          status: 'SCHEDULED'
        },
        {
          id: 'm-102',
          round: 1,
          participant1Id: 'usr-p3',
          participant1Name: 'Player Gamma',
          participant2Id: 'usr-p4',
          participant2Name: 'Player Delta',
          winnerId: undefined,
          status: 'SCHEDULED'
        },
        {
          id: 'm-103',
          round: 2,
          participant1Id: undefined,
          participant2Id: undefined,
          winnerId: undefined,
          status: 'SCHEDULED'
        }
      ]
    };
    this.mockBrackets[tournamentId] = bracket;
    return of(bracket).pipe(delay(250));
  }

  getBracket(tournamentId: string): Observable<BracketResponse> {
    const existing = this.mockBrackets[tournamentId];
    if (existing) {
      return of(existing).pipe(delay(200));
    }
    // Generate empty/demo
    return this.generateBracket(tournamentId);
  }

  recordMatchResult(tournamentId: string, matchId: string, winnerId: string): Observable<MatchResponse> {
    const bracket = this.mockBrackets[tournamentId];
    if (!bracket) return throwError(() => new Error('Bracket not found'));
    const match = bracket.matches.find((m) => m.id === matchId);
    if (!match) return throwError(() => new Error('Match not found'));

    match.winnerId = winnerId;
    match.winnerName = winnerId === match.participant1Id ? match.participant1Name : match.participant2Name;
    match.status = 'COMPLETED';

    // Auto-advance next round match if available
    const nextRoundMatch = bracket.matches.find((m) => m.round === match.round + 1 && (!m.participant1Id || !m.participant2Id));
    if (nextRoundMatch) {
      if (!nextRoundMatch.participant1Id) {
        nextRoundMatch.participant1Id = winnerId;
        nextRoundMatch.participant1Name = match.winnerName;
      } else if (!nextRoundMatch.participant2Id) {
        nextRoundMatch.participant2Id = winnerId;
        nextRoundMatch.participant2Name = match.winnerName;
      }
    }

    return of({ ...match }).pipe(delay(200));
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

  getAdminBookingStats(): Observable<AdminBookingStatsResponse> {
    return of<AdminBookingStatsResponse>({
      todayTotalBookings: 18,
      todayConfirmedBookings: 14,
      todayCancelledBookings: 2,
      activeSessionsNow: 5,
      monthTotalBookings: 248,
      allTimeTotalBookings: 1840,
      allTimeCancelled: 64
    }).pipe(delay(200));
  }

  getAdminPaymentStats(trendDays: number = 14): Observable<AdminPaymentStatsResponse> {
    const today = new Date();
    const trend = Array.from({ length: trendDays }).map((_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - (trendDays - 1 - i));
      const dateStr = d.toISOString().split('T')[0];
      // Generate realistic daily revenue around 12,000 - 38,000 LKR
      const dayFactor = (i % 7 === 5 || i % 7 === 6) ? 1.6 : 1.0;
      const baseRev = Math.round((18000 + (Math.sin(i * 1.5) * 6000)) * dayFactor);
      return {
        date: dateStr,
        revenue: Math.max(5000, baseRev)
      };
    });

    return of<AdminPaymentStatsResponse>({
      todayRevenue: 28650,
      monthRevenue: 485200,
      totalPaymentsSuccess: 1720,
      totalPaymentsFailed: 42,
      revenueTrend: trend
    }).pipe(delay(250));
  }

  getAdminUserStats(): Observable<AdminUserStatsResponse> {
    return of<AdminUserStatsResponse>({
      totalUsers: 840,
      activeUsers: 812,
      deactivatedUsers: 28,
      customerCount: 824,
      adminCount: 16,
      newUsersToday: 6,
      newUsersThisMonth: 94
    }).pipe(delay(150));
  }

  getAdminTournamentStats(): Observable<AdminTournamentStatsResponse> {
    return of<AdminTournamentStatsResponse>({
      totalTournaments: 12,
      upcomingTournaments: 3,
      ongoingTournaments: 1,
      completedTournaments: 7,
      cancelledTournaments: 1,
      totalParticipants: 218
    }).pipe(delay(200));
  }

  getAdminRecentBookings(): Observable<AdminBookingRow[]> {
    const todayStr = new Date().toISOString().split('T')[0];
    const rows: AdminBookingRow[] = [
      {
        id: 'bk-101',
        userId: 'usr-customer-1',
        stationId: 'st-01',
        stationCode: 'PS5-01',
        stationType: 'PS5',
        hourlyRate: 650,
        startTime: `${todayStr}T11:00:00Z`,
        endTime: `${todayStr}T13:00:00Z`,
        durationMinutes: 120,
        status: 'IN_PROGRESS',
        source: 'ONLINE',
        paymentId: 'pay-001',
        totalAmount: 1300,
        payableAmount: 1300,
        createdAt: `${todayStr}T09:30:00Z`
      },
      {
        id: 'bk-102',
        userId: 'usr-customer-2',
        stationId: 'st-04',
        stationCode: 'PC-04',
        stationType: 'PC_ESPORTS',
        hourlyRate: 800,
        startTime: `${todayStr}T11:30:00Z`,
        endTime: `${todayStr}T14:30:00Z`,
        durationMinutes: 180,
        status: 'IN_PROGRESS',
        source: 'WALK_IN',
        paymentId: 'pay-002',
        totalAmount: 2400,
        payableAmount: 2400,
        createdAt: `${todayStr}T11:15:00Z`
      },
      {
        id: 'bk-103',
        userId: 'usr-customer-3',
        stationId: 'st-03',
        stationCode: 'XBOX-03',
        stationType: 'XBOX_SERIES_X',
        hourlyRate: 600,
        startTime: `${todayStr}T14:00:00Z`,
        endTime: `${todayStr}T16:00:00Z`,
        durationMinutes: 120,
        status: 'CONFIRMED',
        source: 'ONLINE',
        paymentId: 'pay-003',
        totalAmount: 1200,
        payableAmount: 1200,
        createdAt: `${todayStr}T10:00:00Z`
      },
      {
        id: 'bk-104',
        userId: 'usr-customer-4',
        stationId: 'st-02',
        stationCode: 'PS5-02',
        stationType: 'PS5',
        hourlyRate: 650,
        startTime: `${todayStr}T16:00:00Z`,
        endTime: `${todayStr}T18:00:00Z`,
        durationMinutes: 120,
        status: 'CONFIRMED',
        source: 'ONLINE',
        paymentId: 'pay-004',
        totalAmount: 1300,
        payableAmount: 1300,
        createdAt: `${todayStr}T10:30:00Z`
      },
      {
        id: 'bk-105',
        userId: 'usr-customer-5',
        stationId: 'st-01',
        stationCode: 'PS5-01',
        stationType: 'PS5',
        hourlyRate: 650,
        startTime: `${todayStr}T09:00:00Z`,
        endTime: `${todayStr}T10:00:00Z`,
        durationMinutes: 60,
        status: 'COMPLETED',
        source: 'WALK_IN',
        paymentId: 'pay-005',
        totalAmount: 650,
        payableAmount: 650,
        createdAt: `${todayStr}T08:50:00Z`
      }
    ];
    return of(rows).pipe(delay(200));
  }

  getAdminUsers(filter: UserFilter): Observable<PagedUsers> {
    let list = this.mockUsers.map((u) => ({
      id: u.id,
      email: u.email,
      fullName: u.fullName,
      phoneNumber: u.phoneNumber,
      role: u.role,
      enabled: u.enabled,
      createdAt: u.createdAt,
      deactivatedBy: u.deactivatedBy
    }));

    if (filter.search) {
      const q = filter.search.toLowerCase();
      list = list.filter((u) =>
        u.fullName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.phoneNumber && u.phoneNumber.includes(q))
      );
    }

    if (filter.role) {
      list = list.filter((u) => u.role === filter.role);
    }

    if (filter.enabled !== undefined && filter.enabled !== null) {
      list = list.filter((u) => u.enabled === filter.enabled);
    }

    const pageSize = filter.size || 10;
    const pageNum = filter.page || 0;
    const total = list.length;
    const start = pageNum * pageSize;
    const content = list.slice(start, start + pageSize);

    return of<PagedUsers>({
      content,
      totalElements: total,
      totalPages: Math.ceil(total / pageSize) || 1,
      number: pageNum,
      size: pageSize
    }).pipe(delay(200));
  }

  getAdminUserById(userId: string): Observable<UserSummaryResponse> {
    const user = this.mockUsers.find((u) => u.id === userId);
    if (!user) return throwError(() => new Error('User not found'));
    return of({
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      phoneNumber: user.phoneNumber,
      role: user.role,
      enabled: user.enabled,
      createdAt: user.createdAt,
      deactivatedBy: user.deactivatedBy
    }).pipe(delay(150));
  }

  adminUpdateUser(userId: string, request: AdminUpdateUserRequest): Observable<UserSummaryResponse> {
    const user = this.mockUsers.find((u) => u.id === userId);
    if (!user) return throwError(() => new Error('User not found'));

    user.fullName = request.fullName;
    if (request.phoneNumber !== undefined) user.phoneNumber = request.phoneNumber;
    if (request.role !== undefined) user.role = request.role;
    if (request.enabled !== undefined) user.enabled = request.enabled;

    return of({
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      phoneNumber: user.phoneNumber,
      role: user.role,
      enabled: user.enabled,
      createdAt: user.createdAt,
      deactivatedBy: user.deactivatedBy
    }).pipe(delay(200));
  }

  adminDeactivateUser(userId: string): Observable<void> {
    const user = this.mockUsers.find((u) => u.id === userId);
    if (user) {
      user.enabled = false;
      user.deactivatedBy = 'ADMIN';
    }
    return of(void 0).pipe(delay(200));
  }

  adminActivateUser(userId: string): Observable<void> {
    const user = this.mockUsers.find((u) => u.id === userId);
    if (user) {
      user.enabled = true;
      user.deactivatedBy = null;
    }
    return of(void 0).pipe(delay(200));
  }

  // ── Payment Mock Data ────────────────────────────────────────────────────
  private readonly mockPayments: PaymentResponse[] = [
    {
      id: 'pay-001',
      userId: 'usr-customer-1',
      referenceType: 'BOOKING',
      referenceId: 'bk-001',
      amount: 1500,
      originalAmount: 2000,
      loyaltyPointsUsed: 50,
      loyaltyDiscount: 500,
      method: 'CARD',
      status: 'SUCCESS',
      receiptNumber: 'RCP-2026-001',
      transactionReference: 'TXN-CARD-001',
      customerName: 'Kasun Perera',
      customerEmail: 'player@gamingcastle.lk',
      createdAt: '2026-10-01T10:00:00Z',
      updatedAt: '2026-10-01T10:01:00Z'
    },
    {
      id: 'pay-002',
      userId: 'usr-customer-2',
      referenceType: 'BOOKING',
      referenceId: 'bk-002',
      amount: 2400,
      method: 'ONLINE',
      status: 'SUCCESS',
      receiptNumber: 'RCP-2026-002',
      transactionReference: 'TXN-ONLINE-002',
      customerName: 'Nimal Silva',
      customerEmail: 'nimal@gamingcastle.lk',
      createdAt: '2026-10-02T14:30:00Z'
    },
    {
      id: 'pay-003',
      userId: 'usr-customer-3',
      referenceType: 'TOURNAMENT',
      referenceId: 'tour-001',
      amount: 500,
      method: 'CASH',
      status: 'SUCCESS',
      receiptNumber: 'RCP-2026-003',
      customerName: 'Amali Fernando',
      customerEmail: 'amali@gamingcastle.lk',
      createdAt: '2026-10-03T09:15:00Z'
    },
    {
      id: 'pay-004',
      userId: 'usr-customer-4',
      referenceType: 'BOOKING',
      referenceId: 'bk-003',
      amount: 3200,
      method: 'CARD',
      status: 'FAILED',
      receiptNumber: 'RCP-2026-004',
      transactionReference: 'TXN-CARD-FAIL-004',
      customerName: 'Ruwan Jayasinghe',
      customerEmail: 'ruwan@gamingcastle.lk',
      createdAt: '2026-10-04T16:45:00Z'
    },
    {
      id: 'pay-005',
      userId: 'usr-customer-1',
      referenceType: 'BOOKING',
      referenceId: 'bk-004',
      amount: 800,
      method: 'LOYALTY_POINTS',
      loyaltyPointsUsed: 160,
      loyaltyDiscount: 800,
      status: 'SUCCESS',
      receiptNumber: 'RCP-2026-005',
      customerName: 'Kasun Perera',
      customerEmail: 'player@gamingcastle.lk',
      createdAt: '2026-10-05T11:00:00Z'
    },
    {
      id: 'pay-006',
      userId: 'usr-customer-2',
      referenceType: 'BOOKING',
      referenceId: 'bk-005',
      amount: 1800,
      method: 'CARD',
      status: 'REFUNDED',
      receiptNumber: 'RCP-2026-006',
      transactionReference: 'TXN-REFUND-006',
      customerName: 'Nimal Silva',
      customerEmail: 'nimal@gamingcastle.lk',
      createdAt: '2026-10-06T13:20:00Z',
      updatedAt: '2026-10-07T08:00:00Z'
    },
    {
      id: 'pay-007',
      userId: 'usr-customer-3',
      referenceType: 'TOURNAMENT',
      referenceId: 'tour-002',
      amount: 500,
      method: 'ONLINE',
      status: 'PENDING',
      receiptNumber: 'RCP-2026-007',
      customerName: 'Amali Fernando',
      customerEmail: 'amali@gamingcastle.lk',
      createdAt: '2026-10-07T17:05:00Z'
    },
    {
      id: 'pay-008',
      userId: 'usr-customer-4',
      referenceType: 'BOOKING',
      referenceId: 'bk-006',
      amount: 4500,
      method: 'ONLINE',
      status: 'SUCCESS',
      receiptNumber: 'RCP-2026-008',
      transactionReference: 'TXN-ONLINE-008',
      customerName: 'Ruwan Jayasinghe',
      customerEmail: 'ruwan@gamingcastle.lk',
      createdAt: '2026-10-08T10:30:00Z'
    },
    {
      id: 'pay-009',
      userId: 'usr-customer-1',
      referenceType: 'BOOKING',
      referenceId: 'bk-007',
      amount: 2100,
      method: 'CASH',
      status: 'SUCCESS',
      receiptNumber: 'RCP-2026-009',
      customerName: 'Kasun Perera',
      customerEmail: 'player@gamingcastle.lk',
      createdAt: '2026-10-09T09:00:00Z'
    },
    {
      id: 'pay-010',
      userId: 'usr-customer-5',
      referenceType: 'TOURNAMENT',
      referenceId: 'tour-001',
      amount: 500,
      method: 'CARD',
      status: 'SUCCESS',
      receiptNumber: 'RCP-2026-010',
      transactionReference: 'TXN-CARD-010',
      customerName: 'Dilshan Rathnayake',
      customerEmail: 'dilshan@gamingcastle.lk',
      createdAt: '2026-10-10T12:00:00Z'
    }
  ];

  getAdminPayments(filter: PaymentFilter): Observable<PagedPayments> {
    let results = [...this.mockPayments];

    if (filter.status) {
      results = results.filter(p => p.status === filter.status);
    }
    if (filter.method) {
      results = results.filter(p =>
        (p.method === filter.method) || (p.paymentMethod === filter.method)
      );
    }
    if (filter.referenceType) {
      results = results.filter(p => p.referenceType === filter.referenceType);
    }
    if (filter.userId) {
      results = results.filter(p => p.userId === filter.userId);
    }
    if (filter.from) {
      const from = new Date(filter.from).getTime();
      results = results.filter(p => new Date(p.createdAt).getTime() >= from);
    }
    if (filter.to) {
      const to = new Date(filter.to).getTime() + 86400000;
      results = results.filter(p => new Date(p.createdAt).getTime() <= to);
    }

    const page = filter.page ?? 0;
    const size = filter.size ?? 12;
    const start = page * size;
    const content = results.slice(start, start + size);

    return of({
      content,
      totalElements: results.length,
      totalPages: Math.max(1, Math.ceil(results.length / size)),
      size,
      number: page
    }).pipe(delay(200));
  }

  getAdminPaymentById(paymentId: string): Observable<PaymentResponse> {
    const p = this.mockPayments.find(pay => pay.id === paymentId);
    if (!p) {
      return throwError(() => new Error(`Payment ${paymentId} not found`));
    }
    return of({ ...p }).pipe(delay(150));
  }

  adminRefundPayment(paymentId: string): Observable<PaymentResponse> {
    const p = this.mockPayments.find(pay => pay.id === paymentId);
    if (!p) {
      return throwError(() => new Error(`Payment ${paymentId} not found`));
    }
    if (p.status !== 'SUCCESS') {
      return throwError(() => new Error('Only successful payments can be refunded'));
    }
    p.status = 'REFUNDED' as PaymentStatus;
    p.updatedAt = new Date().toISOString();
    return of({ ...p }).pipe(delay(300));
  }

  exportPaymentsCsv(): Observable<Blob> {
    const headers = ['ID', 'Receipt #', 'Customer', 'Reference Type', 'Amount (LKR)', 'Method', 'Status', 'Date'];
    const lines = this.mockPayments.map(p => [
      `"${p.id}"`,
      `"${p.receiptNumber || ''}"`,
      `"${(p.customerName || '').replace(/"/g, '""')}"`,
      `"${p.referenceType || ''}"`,
      `"${p.amount.toFixed(2)}"`,
      `"${p.method || p.paymentMethod || ''}"`,
      `"${p.status}"`,
      `"${p.createdAt}"`
    ].join(','));
    const csv = [headers.join(','), ...lines].join('\r\n');
    return of(new Blob([csv], { type: 'text/csv' })).pipe(delay(200));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // FE-32: Reports & Analytics (FR-29)
  // ═══════════════════════════════════════════════════════════════════════════

  getAdminReport(filter: ReportFilter): Observable<AdminReportResponse> {
    const today = new Date();
    const preset = filter.preset || '30days';
    const numDays = preset === 'today' ? 1 : preset === '7days' ? 7 : 30;

    const dates: string[] = [];
    for (let i = numDays - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      dates.push(d.toISOString().split('T')[0]);
    }

    const type = filter.type || 'revenue';

    if (type === 'revenue') {
      const trend = dates.map((date, idx) => {
        const base = 18000 + Math.sin(idx * 0.9) * 8000 + (idx % 7 >= 5 ? 12000 : 0);
        const cashPortion = Math.round(base * 0.42);
        const cardPortion = Math.round(base * 0.58);
        return {
          date,
          label: date.slice(5),
          primaryValue: Math.round(base),
          secondaryValue: cashPortion,
          tertiaryValue: cardPortion
        };
      });

      const totalRev = trend.reduce((sum, d) => sum + d.primaryValue, 0);
      const avgDaily = Math.round(totalRev / numDays);

      return of<AdminReportResponse>({
        reportType: 'revenue',
        title: 'Financial Revenue & Collections Report',
        generatedAt: new Date().toISOString(),
        dateRange: {
          startDate: dates[0],
          endDate: dates[dates.length - 1]
        },
        kpis: [
          {
            id: 'kpi-tot-rev',
            label: 'Total Revenue',
            value: `LKR ${totalRev.toLocaleString()}`,
            numericValue: totalRev,
            changePct: 14.8,
            changeType: 'positive',
            helper: 'vs previous period',
            icon: '💰'
          },
          {
            id: 'kpi-avg-rev',
            label: 'Daily Average',
            value: `LKR ${avgDaily.toLocaleString()}`,
            numericValue: avgDaily,
            changePct: 8.2,
            changeType: 'positive',
            helper: 'Consistent weekday floor',
            icon: '📈'
          },
          {
            id: 'kpi-points-red',
            label: 'Points Redeemed Value',
            value: 'LKR 46,500',
            numericValue: 46500,
            changePct: 22.4,
            changeType: 'positive',
            helper: 'Loyalty program adoption',
            icon: '🎁'
          },
          {
            id: 'kpi-refund-amt',
            label: 'Total Refunded',
            value: 'LKR 4,800',
            numericValue: 4800,
            changePct: -18.5,
            changeType: 'positive',
            helper: '1.2% refund rate',
            icon: '↩'
          }
        ],
        trend,
        breakdowns: [
          { category: 'Credit / Debit Card', value: Math.round(totalRev * 0.55), formattedValue: `LKR ${Math.round(totalRev * 0.55).toLocaleString()}`, percentage: 55, count: 482, color: '#3b82f6' },
          { category: 'Cash Walk-ins', value: Math.round(totalRev * 0.32), formattedValue: `LKR ${Math.round(totalRev * 0.32).toLocaleString()}`, percentage: 32, count: 280, color: '#10b981' },
          { category: 'Online Gateway', value: Math.round(totalRev * 0.13), formattedValue: `LKR ${Math.round(totalRev * 0.13).toLocaleString()}`, percentage: 13, count: 114, color: '#8b5cf6' }
        ],
        tableColumns: [
          { key: 'date', label: 'Date', format: 'date' },
          { key: 'transactions', label: 'Transactions', format: 'number', align: 'center' },
          { key: 'grossRevenue', label: 'Gross Revenue (LKR)', format: 'currency', align: 'right' },
          { key: 'cardShare', label: 'Card (LKR)', format: 'currency', align: 'right' },
          { key: 'cashShare', label: 'Cash (LKR)', format: 'currency', align: 'right' },
          { key: 'status', label: 'Audit Status', format: 'badge', align: 'center' }
        ],
        tableData: dates.map((d, i) => {
          const gross = Math.round(18000 + Math.sin(i * 0.9) * 8000 + (i % 7 >= 5 ? 12000 : 0));
          const txCount = Math.round(gross / 1150);
          return {
            date: d,
            transactions: txCount,
            grossRevenue: gross,
            cardShare: Math.round(gross * 0.58),
            cashShare: Math.round(gross * 0.42),
            status: 'VERIFIED'
          };
        })
      }).pipe(delay(200));
    }

    if (type === 'utilization') {
      const trend = dates.map((date, idx) => {
        const util = Math.min(98, Math.max(38, Math.round(62 + Math.cos(idx * 0.7) * 22 + (idx % 7 >= 5 ? 18 : 0))));
        return {
          date,
          label: date.slice(5),
          primaryValue: util,
          secondaryValue: Math.round(util * 0.7)
        };
      });

      const avgUtil = Math.round(trend.reduce((s, t) => s + t.primaryValue, 0) / trend.length);

      return of<AdminReportResponse>({
        reportType: 'utilization',
        title: 'Gaming Station Occupancy & Peak Hours',
        generatedAt: new Date().toISOString(),
        dateRange: {
          startDate: dates[0],
          endDate: dates[dates.length - 1]
        },
        kpis: [
          {
            id: 'kpi-avg-util',
            label: 'Average Station Utilization',
            value: `${avgUtil}%`,
            numericValue: avgUtil,
            changePct: 6.5,
            changeType: 'positive',
            helper: 'Peak hours 17:00 - 22:00',
            icon: '🎮'
          },
          {
            id: 'kpi-peak-station',
            label: 'Most Popular Station',
            value: 'PS5-01 (88.4%)',
            numericValue: 88.4,
            helper: '312 hours booked',
            icon: '🏆'
          },
          {
            id: 'kpi-total-hours',
            label: 'Total Hours Booked',
            value: '1,428 hrs',
            numericValue: 1428,
            changePct: 11.2,
            changeType: 'positive',
            helper: 'Across 12 stations',
            icon: '⏱'
          },
          {
            id: 'kpi-turnover',
            label: 'Turnaround Idle Time',
            value: '14 mins',
            numericValue: 14,
            changePct: -12.0,
            changeType: 'positive',
            helper: 'Station cleaning/reset',
            icon: '🔄'
          }
        ],
        trend,
        breakdowns: [
          { category: 'PlayStation 5 (4 stations)', value: 82, formattedValue: '82% Avg', percentage: 82, count: 4, color: '#3b82f6' },
          { category: 'PC Gaming Rigs (4 stations)', value: 76, formattedValue: '76% Avg', percentage: 76, count: 4, color: '#10b981' },
          { category: 'Xbox Series X (2 stations)', value: 68, formattedValue: '68% Avg', percentage: 68, count: 2, color: '#10b981' },
          { category: 'VR Pod & Racing Sim (2 stations)', value: 59, formattedValue: '59% Avg', percentage: 59, count: 2, color: '#f59e0b' }
        ],
        tableColumns: [
          { key: 'stationCode', label: 'Station', format: 'text' },
          { key: 'type', label: 'Type', format: 'text' },
          { key: 'hoursBooked', label: 'Hours Booked', format: 'number', align: 'center' },
          { key: 'occupancyPct', label: 'Occupancy Rate', format: 'percentage', align: 'center' },
          { key: 'revenueGen', label: 'Revenue Generated (LKR)', format: 'currency', align: 'right' }
        ],
        tableData: [
          { stationCode: 'PS5-01', type: 'PLAYSTATION_5', hoursBooked: 248, occupancyPct: 88.6, revenueGen: 198400 },
          { stationCode: 'PS5-02', type: 'PLAYSTATION_5', hoursBooked: 236, occupancyPct: 84.3, revenueGen: 188800 },
          { stationCode: 'PC-01', type: 'PC_RIG', hoursBooked: 224, occupancyPct: 80.0, revenueGen: 224000 },
          { stationCode: 'PC-02', type: 'PC_RIG', hoursBooked: 218, occupancyPct: 77.8, revenueGen: 218000 },
          { stationCode: 'XBOX-01', type: 'XBOX_SERIES_X', hoursBooked: 192, occupancyPct: 68.5, revenueGen: 144000 },
          { stationCode: 'VR-01', type: 'VR_SIMULATOR', hoursBooked: 165, occupancyPct: 58.9, revenueGen: 247500 }
        ]
      }).pipe(delay(200));
    }

    if (type === 'bookings') {
      const trend = dates.map((date, idx) => {
        const total = Math.round(28 + Math.sin(idx * 0.8) * 12 + (idx % 7 >= 5 ? 18 : 0));
        const walkin = Math.round(total * 0.35);
        return {
          date,
          label: date.slice(5),
          primaryValue: total,
          secondaryValue: walkin
        };
      });

      const totalBookings = trend.reduce((s, t) => s + t.primaryValue, 0);

      return of<AdminReportResponse>({
        reportType: 'bookings',
        title: 'Booking Manifest & Channel Analytics',
        generatedAt: new Date().toISOString(),
        dateRange: {
          startDate: dates[0],
          endDate: dates[dates.length - 1]
        },
        kpis: [
          {
            id: 'kpi-tot-bks',
            label: 'Total Bookings',
            value: totalBookings.toString(),
            numericValue: totalBookings,
            changePct: 13.4,
            changeType: 'positive',
            helper: 'Online + Walk-in',
            icon: '📅'
          },
          {
            id: 'kpi-compl-rate',
            label: 'Completion Rate',
            value: '94.2%',
            numericValue: 94.2,
            changePct: 2.1,
            changeType: 'positive',
            helper: 'Low cancellation floor',
            icon: '✅'
          },
          {
            id: 'kpi-online-ratio',
            label: 'Online Booking Share',
            value: '65.8%',
            numericValue: 65.8,
            changePct: 5.4,
            changeType: 'positive',
            helper: 'Web portal adoption',
            icon: '🌐'
          },
          {
            id: 'kpi-avg-duration',
            label: 'Avg Session Length',
            value: '2.4 hours',
            numericValue: 2.4,
            changePct: 0.8,
            changeType: 'neutral',
            helper: 'Standard reservation',
            icon: '⏳'
          }
        ],
        trend,
        breakdowns: [
          { category: 'Customer Portal (Online)', value: Math.round(totalBookings * 0.66), formattedValue: `${Math.round(totalBookings * 0.66)} Bookings`, percentage: 66, color: '#3b82f6' },
          { category: 'Admin Walk-in Desk', value: Math.round(totalBookings * 0.34), formattedValue: `${Math.round(totalBookings * 0.34)} Bookings`, percentage: 34, color: '#8b5cf6' }
        ],
        tableColumns: [
          { key: 'date', label: 'Date', format: 'date' },
          { key: 'totalBookings', label: 'Total', format: 'number', align: 'center' },
          { key: 'onlineCount', label: 'Online', format: 'number', align: 'center' },
          { key: 'walkinCount', label: 'Walk-in', format: 'number', align: 'center' },
          { key: 'cancelledCount', label: 'Cancelled', format: 'number', align: 'center' },
          { key: 'avgHours', label: 'Avg Duration (h)', format: 'number', align: 'right' }
        ],
        tableData: dates.map((d, i) => {
          const tot = Math.round(28 + Math.sin(i * 0.8) * 12 + (i % 7 >= 5 ? 18 : 0));
          return {
            date: d,
            totalBookings: tot,
            onlineCount: Math.round(tot * 0.65),
            walkinCount: Math.round(tot * 0.35),
            cancelledCount: Math.max(0, Math.round(tot * 0.05)),
            avgHours: 2.4
          };
        })
      }).pipe(delay(200));
    }

    // Default: 'users'
    const trend = dates.map((date, idx) => {
      const newUsers = Math.max(1, Math.round(4 + Math.sin(idx * 0.6) * 3 + (idx % 7 >= 5 ? 3 : 0)));
      return {
        date,
        label: date.slice(5),
        primaryValue: newUsers,
        secondaryValue: newUsers * 3
      };
    });

    return of<AdminReportResponse>({
      reportType: 'users',
      title: 'Customer Acquisition & Loyalty Growth',
      generatedAt: new Date().toISOString(),
      dateRange: {
        startDate: dates[0],
        endDate: dates[dates.length - 1]
      },
      kpis: [
        {
          id: 'kpi-tot-members',
          label: 'Total Registered Gamers',
          value: '840',
          numericValue: 840,
          changePct: 9.8,
          changeType: 'positive',
          helper: 'Across active database',
          icon: '👥'
        },
        {
          id: 'kpi-new-members',
          label: 'New Registrations',
          value: '94',
          numericValue: 94,
          changePct: 15.2,
          changeType: 'positive',
          helper: 'In selected period',
          icon: '✨'
        },
        {
          id: 'kpi-repeat-rate',
          label: 'Repeat Player Ratio',
          value: '72.4%',
          numericValue: 72.4,
          changePct: 4.1,
          changeType: 'positive',
          helper: 'Booked 2+ times',
          icon: '🔁'
        },
        {
          id: 'kpi-vip-share',
          label: 'VIP & Gold Tier Gamers',
          value: '112',
          numericValue: 112,
          changePct: 18.0,
          changeType: 'positive',
          helper: 'Top tier loyalty accounts',
          icon: '👑'
        }
      ],
      trend,
      breakdowns: [
        { category: 'Bronze (Standard)', value: 540, formattedValue: '540 Users', percentage: 64, color: '#a3a3a3' },
        { category: 'Silver Members', value: 188, formattedValue: '188 Users', percentage: 22, color: '#94a3b8' },
        { category: 'Gold Members', value: 84, formattedValue: '84 Users', percentage: 10, color: '#f59e0b' },
        { category: 'VIP Elite', value: 28, formattedValue: '28 Users', percentage: 4, color: '#ec4899' }
      ],
      tableColumns: [
        { key: 'tier', label: 'Loyalty Tier', format: 'text' },
        { key: 'userCount', label: 'Gamers', format: 'number', align: 'center' },
        { key: 'avgSpentLkr', label: 'Avg Spent (LKR)', format: 'currency', align: 'right' },
        { key: 'avgPoints', label: 'Avg Points Balance', format: 'number', align: 'center' },
        { key: 'churnRate', label: '30-Day Activity Rate', format: 'percentage', align: 'center' }
      ],
      tableData: [
        { tier: 'VIP Elite', userCount: 28, avgSpentLkr: 64800, avgPoints: 1240, churnRate: 96.4 },
        { tier: 'Gold', userCount: 84, avgSpentLkr: 38200, avgPoints: 680, churnRate: 88.1 },
        { tier: 'Silver', userCount: 188, avgSpentLkr: 19400, avgPoints: 310, churnRate: 74.5 },
        { tier: 'Bronze', userCount: 540, avgSpentLkr: 8200, avgPoints: 85, churnRate: 58.2 }
      ]
    }).pipe(delay(200));
  }

  exportReportCsv(filter: ReportFilter): Observable<Blob> {
    const reportType = filter.type || 'revenue';
    const lines = [
      `"Gaming Castle — ${reportType.toUpperCase()} REPORT"`,
      `"Generated At","${new Date().toISOString()}"`,
      `"Date Range Preset","${filter.preset}"`,
      '',
      `"Date","Category","Value LKR","Transactions","Status"`
    ];

    for (let i = 1; i <= 15; i++) {
      const d = `2026-10-${i < 10 ? '0' + i : i}`;
      const val = 18000 + (i * 850);
      lines.push(`"${d}","Station Rentals","${val}","${Math.round(val / 1100)}","AUDITED"`);
    }

    const csv = lines.join('\r\n');
    return of(new Blob([csv], { type: 'text/csv' })).pipe(delay(150));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // FE-33: Game Titles Management (FR-30)
  // ═══════════════════════════════════════════════════════════════════════════

  private mockGames: GameTitle[] = [
    {
      id: 'g-101',
      title: 'Tekken 8',
      genre: 'FIGHTING',
      platforms: ['PS5', 'PC', 'XBOX_SERIES_X'],
      releaseYear: 2024,
      ageRating: 'PEGI_16',
      description: 'The next chapter in the legendary fighting franchise with unmatched visuals and Heat system.',
      coverUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=400&q=80',
      maxPlayers: 2,
      featured: true,
      active: true,
      installedStationCount: 6,
      createdAt: '2026-02-10T10:00:00Z'
    },
    {
      id: 'g-102',
      title: 'EA Sports FC 25',
      genre: 'SPORTS',
      platforms: ['PS5', 'XBOX_SERIES_X', 'PC', 'NINTENDO_SWITCH'],
      releaseYear: 2024,
      ageRating: 'PEGI_3',
      description: '5v5 Rush mode with friends, revamped tactics with FC IQ, and hyper-realistic stadium atmospheres.',
      coverUrl: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=400&q=80',
      maxPlayers: 4,
      featured: true,
      active: true,
      installedStationCount: 8,
      createdAt: '2026-03-01T12:00:00Z'
    },
    {
      id: 'g-103',
      title: 'Cyberpunk 2077: Phantom Liberty',
      genre: 'RPG',
      platforms: ['PC', 'PS5', 'XBOX_SERIES_X'],
      releaseYear: 2023,
      ageRating: 'PEGI_18',
      description: 'Spy-thriller adventure in Night City featuring ray tracing and high-octane cybernetic combat.',
      coverUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=400&q=80',
      maxPlayers: 1,
      featured: false,
      active: true,
      installedStationCount: 4,
      createdAt: '2026-01-15T09:00:00Z'
    },
    {
      id: 'g-104',
      title: 'Forza Horizon 5',
      genre: 'RACING',
      platforms: ['XBOX_SERIES_X', 'PC'],
      releaseYear: 2021,
      ageRating: 'PEGI_3',
      description: 'Explore the vibrant and ever-evolving open-world landscapes of Mexico with hundreds of world-class cars.',
      coverUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=400&q=80',
      maxPlayers: 2,
      featured: false,
      active: true,
      installedStationCount: 3,
      createdAt: '2026-01-18T14:30:00Z'
    },
    {
      id: 'g-105',
      title: 'Valorant',
      genre: 'FPS',
      platforms: ['PC'],
      releaseYear: 2020,
      ageRating: 'PEGI_16',
      description: 'Character-based 5v5 tactical shooter where precise gunplay meets unique agent abilities.',
      coverUrl: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?auto=format&fit=crop&w=400&q=80',
      maxPlayers: 10,
      featured: true,
      active: true,
      installedStationCount: 5,
      createdAt: '2026-01-20T11:00:00Z'
    },
    {
      id: 'g-106',
      title: 'Super Smash Bros. Ultimate',
      genre: 'FIGHTING',
      platforms: ['NINTENDO_SWITCH'],
      releaseYear: 2018,
      ageRating: 'PEGI_12',
      description: 'Gaming icons clash in the ultimate showdown. Over 80 playable fighters and 100+ stages.',
      coverUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=400&q=80',
      maxPlayers: 8,
      featured: false,
      active: true,
      installedStationCount: 2,
      createdAt: '2026-02-05T16:00:00Z'
    },
    {
      id: 'g-107',
      title: 'Gran Turismo 7',
      genre: 'RACING',
      platforms: ['PS5', 'VR'],
      releaseYear: 2022,
      ageRating: 'PEGI_3',
      description: 'The real driving simulator. Complete PS VR2 compatibility with realistic force feedback wheel support.',
      coverUrl: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=400&q=80',
      maxPlayers: 2,
      featured: true,
      active: true,
      installedStationCount: 3,
      createdAt: '2026-02-12T13:00:00Z'
    },
    {
      id: 'g-108',
      title: 'Street Fighter 6',
      genre: 'FIGHTING',
      platforms: ['PS5', 'PC', 'XBOX_SERIES_X'],
      releaseYear: 2023,
      ageRating: 'PEGI_12',
      description: 'Powered by Capcom proprietary RE ENGINE, featuring Fighting Ground, Battle Hub, and World Tour.',
      coverUrl: 'https://images.unsplash.com/photo-1560253023-3ec5d502959f?auto=format&fit=crop&w=400&q=80',
      maxPlayers: 2,
      featured: false,
      active: false,
      installedStationCount: 2,
      createdAt: '2026-02-25T15:00:00Z'
    }
  ];

  getAdminGames(filter?: GameFilter): Observable<GameTitle[]> {
    let result = [...this.mockGames];

    if (filter?.search) {
      const q = filter.search.toLowerCase().trim();
      result = result.filter(g =>
        g.title.toLowerCase().includes(q) ||
        g.genre.toLowerCase().includes(q) ||
        g.description.toLowerCase().includes(q)
      );
    }

    if (filter?.genre) {
      result = result.filter(g => g.genre === filter.genre);
    }

    if (filter?.platform) {
      result = result.filter(g => g.platforms.includes(filter.platform as any));
    }

    if (filter?.active !== undefined && filter?.active !== null) {
      result = result.filter(g => g.active === filter.active);
    }

    if (filter?.featured !== undefined && filter?.featured !== null) {
      result = result.filter(g => g.featured === filter.featured);
    }

    return of(result).pipe(delay(150));
  }

  getAdminGameById(id: string): Observable<GameTitle> {
    const game = this.mockGames.find(g => g.id === id);
    if (!game) {
      return throwError(() => new Error(`Game with id ${id} not found`));
    }
    return of({ ...game }).pipe(delay(100));
  }

  createAdminGame(req: CreateGameRequest): Observable<GameTitle> {
    const newGame: GameTitle = {
      id: `g-${Date.now()}`,
      title: req.title,
      genre: req.genre,
      platforms: req.platforms || ['PS5'],
      releaseYear: req.releaseYear || new Date().getFullYear(),
      ageRating: req.ageRating || 'PEGI_12',
      description: req.description || '',
      coverUrl: req.coverUrl || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=400&q=80',
      maxPlayers: req.maxPlayers || 1,
      featured: !!req.featured,
      active: req.active !== undefined ? req.active : true,
      installedStationCount: 1,
      createdAt: new Date().toISOString()
    };
    this.mockGames.unshift(newGame);
    return of(newGame).pipe(delay(200));
  }

  updateAdminGame(id: string, req: UpdateGameRequest): Observable<GameTitle> {
    const idx = this.mockGames.findIndex(g => g.id === id);
    if (idx === -1) {
      return throwError(() => new Error(`Game ${id} not found`));
    }
    this.mockGames[idx] = {
      ...this.mockGames[idx],
      ...req,
      updatedAt: new Date().toISOString()
    };
    return of({ ...this.mockGames[idx] }).pipe(delay(200));
  }

  deleteAdminGame(id: string): Observable<void> {
    const idx = this.mockGames.findIndex(g => g.id === id);
    if (idx === -1) {
      return throwError(() => new Error(`Game ${id} not found`));
    }
    this.mockGames.splice(idx, 1);
    return of(void 0).pipe(delay(200));
  }

  toggleAdminGameActive(id: string): Observable<GameTitle> {
    const game = this.mockGames.find(g => g.id === id);
    if (!game) {
      return throwError(() => new Error(`Game ${id} not found`));
    }
    game.active = !game.active;
    game.updatedAt = new Date().toISOString();
    return of({ ...game }).pipe(delay(150));
  }

  getAdminGameStats(): Observable<AdminGameStatsResponse> {
    const totalGames = this.mockGames.length;
    const activeGames = this.mockGames.filter(g => g.active).length;
    const featuredGames = this.mockGames.filter(g => g.featured).length;
    const multiplayerGamesCount = this.mockGames.filter(g => g.maxPlayers > 1).length;

    return of({
      totalGames,
      activeGames,
      featuredGames,
      topGenre: 'FIGHTING',
      multiplayerGamesCount
    }).pipe(delay(150));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // FE-34: Loyalty Rules & Manual Adjustments (FR-27)
  // ═══════════════════════════════════════════════════════════════════════════

  private mockLoyaltyRules: LoyaltyRules = {
    id: 'lr-default-01',
    amountPerPoint: 100, // 100 LKR spent = 1 point earned
    pointValueLkr: 1.0,  // 1 point = LKR 1 discount
    minRedeemPoints: 50, // Minimum 50 points needed to redeem
    redeemStep: 10,      // Must redeem in multiples of 10 points
    maxDiscountPercent: 50, // Max 50% discount per transaction
    reservationTimeoutMinutes: 15,
    silverThreshold: 500,
    silverMultiplier: 1.25,
    goldThreshold: 1500,
    goldMultiplier: 1.5,
    updatedBy: 'admin@gamingcastle.lk'
  };

  private mockLoyaltyAccounts: LoyaltyAccountResponse[] = [
    {
      id: 'la-1',
      userId: 'usr-001',
      userName: 'Kasun Perera',
      userEmail: 'kasun@gmail.com',
      phoneNumber: '+94771234567',
      pointsBalance: 1450,
      tier: 'SILVER',
      equivalentDiscountLkr: 1450,
      totalEarnedAllTime: 2200,
      totalRedeemedAllTime: 750,
      updatedAt: '2026-10-12T14:20:00Z'
    },
    {
      id: 'la-2',
      userId: 'usr-002',
      userName: 'Amali Fernando',
      userEmail: 'amali@yahoo.com',
      phoneNumber: '+94719876543',
      pointsBalance: 2480,
      tier: 'GOLD',
      equivalentDiscountLkr: 2480,
      totalEarnedAllTime: 3600,
      totalRedeemedAllTime: 1120,
      updatedAt: '2026-10-14T11:15:00Z'
    },
    {
      id: 'la-3',
      userId: 'usr-003',
      userName: 'Dinesh Jayasuriya',
      userEmail: 'dinesh.j@outlook.com',
      phoneNumber: '+94765554433',
      pointsBalance: 280,
      tier: 'BRONZE',
      equivalentDiscountLkr: 280,
      totalEarnedAllTime: 480,
      totalRedeemedAllTime: 200,
      updatedAt: '2026-10-08T09:40:00Z'
    },
    {
      id: 'la-4',
      userId: 'usr-004',
      userName: 'Naveen De Silva',
      userEmail: 'naveen.gaming@gmail.com',
      phoneNumber: '+94701122334',
      pointsBalance: 4200,
      tier: 'VIP',
      equivalentDiscountLkr: 4200,
      totalEarnedAllTime: 6500,
      totalRedeemedAllTime: 2300,
      updatedAt: '2026-10-15T10:05:00Z'
    },
    {
      id: 'la-5',
      userId: 'usr-005',
      userName: 'Sanduni Wickrama',
      userEmail: 'sanduni@icloud.com',
      phoneNumber: '+94788899001',
      pointsBalance: 120,
      tier: 'BRONZE',
      equivalentDiscountLkr: 120,
      totalEarnedAllTime: 120,
      totalRedeemedAllTime: 0,
      updatedAt: '2026-10-04T16:30:00Z'
    },
    {
      id: 'la-6',
      userId: 'usr-006',
      userName: 'Roshan Samarasinghe',
      userEmail: 'roshan.s@gmail.com',
      phoneNumber: '+94773344556',
      pointsBalance: 890,
      tier: 'SILVER',
      equivalentDiscountLkr: 890,
      totalEarnedAllTime: 1400,
      totalRedeemedAllTime: 510,
      updatedAt: '2026-10-13T18:50:00Z'
    }
  ];

  private mockLoyaltyTransactions: LoyaltyTransactionDto[] = [
    {
      id: 'lt-101',
      userId: 'usr-001',
      userName: 'Kasun Perera',
      points: 150,
      type: 'EARN',
      description: 'Session completion reward (PS5-01, 2 hrs)',
      createdAt: '2026-10-14T18:00:00Z'
    },
    {
      id: 'lt-102',
      userId: 'usr-004',
      userName: 'Naveen De Silva',
      points: -200,
      type: 'REDEEM',
      description: 'Checkout discount redeemed (Booking #B-902)',
      createdAt: '2026-10-14T16:30:00Z'
    },
    {
      id: 'lt-103',
      userId: 'usr-002',
      userName: 'Amali Fernando',
      points: 500,
      type: 'ADMIN_ADJUST',
      description: 'Admin gesture: Tournament runner-up bonus points',
      createdAt: '2026-10-13T11:15:00Z'
    },
    {
      id: 'lt-104',
      userId: 'usr-003',
      userName: 'Dinesh Jayasuriya',
      points: -50,
      type: 'ADMIN_ADJUST',
      description: 'Admin adjustment: Booking cancellation fee adjustment',
      createdAt: '2026-10-11T14:20:00Z'
    }
  ];

  getAdminLoyaltyRules(): Observable<LoyaltyRules> {
    return of({ ...this.mockLoyaltyRules }).pipe(delay(150));
  }

  updateAdminLoyaltyRules(req: UpdateLoyaltyRulesRequest): Observable<LoyaltyRules> {
    this.mockLoyaltyRules = {
      ...this.mockLoyaltyRules,
      ...req,
      updatedBy: 'admin@gamingcastle.lk'
    };
    return of({ ...this.mockLoyaltyRules }).pipe(delay(250));
  }

  adjustUserLoyaltyPoints(req: AdjustPointsRequest): Observable<AdminAdjustmentResponse> {
    const account = this.mockLoyaltyAccounts.find(a => a.userId === req.userId);
    if (!account) {
      return throwError(() => new Error(`Loyalty account for user ${req.userId} not found`));
    }

    const prevBalance = account.pointsBalance;
    const newBalance = Math.max(0, prevBalance + req.points);
    account.pointsBalance = newBalance;
    account.equivalentDiscountLkr = Math.round(newBalance * this.mockLoyaltyRules.pointValueLkr);

    // Recompute tier
    if (newBalance >= 4000) account.tier = 'VIP';
    else if (newBalance >= this.mockLoyaltyRules.goldThreshold) account.tier = 'GOLD';
    else if (newBalance >= this.mockLoyaltyRules.silverThreshold) account.tier = 'SILVER';
    else account.tier = 'BRONZE';

    account.updatedAt = new Date().toISOString();

    // Record transaction audit
    this.mockLoyaltyTransactions.unshift({
      id: `lt-${Date.now()}`,
      userId: account.userId,
      userName: account.userName,
      points: req.points,
      type: 'ADMIN_ADJUST',
      description: `Manual adjustment: ${req.reason}`,
      createdAt: new Date().toISOString()
    });

    return of({
      userId: account.userId,
      adjustedPoints: req.points,
      newBalance,
      newTier: account.tier,
      reason: req.reason,
      timestamp: new Date().toISOString()
    }).pipe(delay(250));
  }

  getAdminLoyaltyStats(): Observable<AdminLoyaltyStatsResponse> {
    const totalPointsInCirculation = this.mockLoyaltyAccounts.reduce((sum, a) => sum + a.pointsBalance, 0);
    const totalPointsAwardedAllTime = this.mockLoyaltyAccounts.reduce((sum, a) => sum + a.totalEarnedAllTime, 0);
    const totalPointsRedeemedAllTime = this.mockLoyaltyAccounts.reduce((sum, a) => sum + a.totalRedeemedAllTime, 0);

    const counts: Record<string, number> = {
      BRONZE: 0,
      SILVER: 0,
      GOLD: 0,
      VIP: 0
    };
    this.mockLoyaltyAccounts.forEach(a => {
      counts[a.tier] = (counts[a.tier] || 0) + 1;
    });

    return of({
      totalAccounts: this.mockLoyaltyAccounts.length,
      totalPointsInCirculation,
      totalPointsAwardedAllTime,
      totalPointsRedeemedAllTime,
      accountsByTier: counts
    }).pipe(delay(150));
  }

  getAdminLoyaltyAccounts(filter?: LoyaltyAccountFilter): Observable<PagedLoyaltyAccounts> {
    let result = [...this.mockLoyaltyAccounts];

    if (filter?.search) {
      const q = filter.search.toLowerCase().trim();
      result = result.filter(a =>
        a.userName.toLowerCase().includes(q) ||
        a.userEmail.toLowerCase().includes(q) ||
        (a.phoneNumber && a.phoneNumber.includes(q))
      );
    }

    if (filter?.tier) {
      result = result.filter(a => a.tier === filter.tier);
    }

    const page = filter?.page || 0;
    const size = filter?.size || 10;
    const start = page * size;
    const content = result.slice(start, start + size);

    return of({
      content,
      totalElements: result.length,
      totalPages: Math.max(1, Math.ceil(result.length / size)),
      size,
      number: page
    }).pipe(delay(150));
  }

  getAdminLoyaltyTransactions(): Observable<LoyaltyTransactionDto[]> {
    return of([...this.mockLoyaltyTransactions]).pipe(delay(150));
  }
}
