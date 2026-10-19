import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { TournamentService } from './tournament.service';
import { ApiService } from './api.service';
import { MockDataService } from './mock/mock-data.service';
import { AuthService } from './auth.service';
import { TournamentResponse, RegistrationResponse, BracketResponse } from '../../shared/models';

describe('TournamentService', () => {
  let service: TournamentService;
  let apiServiceSpy: jasmine.SpyObj<ApiService>;
  let mockDataSpy: jasmine.SpyObj<MockDataService>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;

  const mockTournament: TournamentResponse = {
    id: 't-101',
    name: 'FC 25 Grand Championship',
    gameTitle: 'EA Sports FC 25',
    startDate: new Date(Date.now() + 86400000 * 2).toISOString(),
    registrationDeadline: new Date(Date.now() + 86400000).toISOString(),
    entryFee: 1500,
    maxParticipants: 16,
    participantCount: 8,
    status: 'REGISTRATION_OPEN',
    isRegistrationOpen: true
  };

  const mockRegistration: RegistrationResponse = {
    id: 'reg-1',
    tournamentId: 't-101',
    tournamentName: 'FC 25 Grand Championship',
    userId: 'usr-1',
    status: 'CONFIRMED',
    paymentId: 'pay-1',
    registeredAt: new Date().toISOString()
  };

  const mockBracket: BracketResponse = {
    id: 'brk-1',
    tournamentId: 't-101',
    generatedAt: new Date().toISOString(),
    matches: [
      {
        id: 'm-1',
        round: 1,
        participant1Id: 'usr-1',
        participant1Name: 'Player 1',
        participant2Id: 'usr-2',
        participant2Name: 'Player 2',
        status: 'SCHEDULED'
      }
    ]
  };

  beforeEach(() => {
    apiServiceSpy = jasmine.createSpyObj('ApiService', ['get', 'post']);
    mockDataSpy = jasmine.createSpyObj('MockDataService', [
      'getTournaments',
      'getTournamentById',
      'registerForTournament',
      'getMyTournamentRegistrations',
      'getBracket'
    ]);
    authServiceSpy = jasmine.createSpyObj('AuthService', ['currentUser']);
    authServiceSpy.currentUser.and.returnValue({
      userId: 'usr-1',
      sub: 'usr-1',
      role: 'CUSTOMER',
      fullName: 'Kasun Player',
      email: 'kasun@gamingcastle.lk',
      iat: 1234567890,
      exp: 1234567890 + 3600
    });

    TestBed.configureTestingModule({
      providers: [
        TournamentService,
        { provide: ApiService, useValue: apiServiceSpy },
        { provide: MockDataService, useValue: mockDataSpy },
        { provide: AuthService, useValue: authServiceSpy }
      ]
    });

    service = TestBed.inject(TournamentService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getTournaments', () => {
    it('should return enriched tournaments from API', (done) => {
      apiServiceSpy.get.and.returnValue(of([mockTournament]));

      service.getTournaments().subscribe({
        next: (tournaments) => {
          expect(tournaments.length).toBe(1);
          expect(tournaments[0].id).toBe('t-101');
          expect(tournaments[0].spotsLeft).toBe(8);
          expect(tournaments[0].progressPercent).toBe(50);
          expect(tournaments[0].isFull).toBeFalse();
          done();
        }
      });
    });

    it('should propagate error if API fails', (done) => {
      apiServiceSpy.get.and.returnValue(throwError(() => new Error('Network error')));

      service.getTournaments().subscribe({
        next: () => fail('Should have failed'),
        error: (err) => {
          expect(err.message).toBe('Network error');
          done();
        }
      });
    });
  });

  describe('getTournamentById', () => {
    it('should return a single enriched tournament', (done) => {
      apiServiceSpy.get.and.returnValue(of(mockTournament));

      service.getTournamentById('t-101').subscribe({
        next: (t) => {
          expect(t.id).toBe('t-101');
          expect(t.name).toBe('FC 25 Grand Championship');
          expect(t.spotsLeft).toBe(8);
          done();
        }
      });
    });

    it('should propagate error if single tournament API fails', (done) => {
      apiServiceSpy.get.and.returnValue(throwError(() => new Error('Not found')));

      service.getTournamentById('t-101').subscribe({
        next: () => fail('Should have failed'),
        error: (err) => {
          expect(err.message).toBe('Not found');
          done();
        }
      });
    });
  });

  describe('registerForTournament', () => {
    it('should submit registration and return response', (done) => {
      apiServiceSpy.post.and.returnValue(of(mockRegistration));

      service.registerForTournament('t-101', 'GamerKasun').subscribe({
        next: (res) => {
          expect(res.id).toBe('reg-1');
          expect(res.status).toBe('CONFIRMED');
          expect(apiServiceSpy.post).toHaveBeenCalledWith('/tournaments/t-101/register', {
            gamerTag: 'GamerKasun'
          });
          done();
        }
      });
    });

    it('should rethrow error on backend validation failures', (done) => {
      const errResponse = { status: 409, error: { message: 'Already registered' } };
      apiServiceSpy.post.and.returnValue(throwError(() => errResponse));

      service.registerForTournament('t-101', 'GamerKasun').subscribe({
        error: (err) => {
          expect(err.status).toBe(409);
          done();
        }
      });
    });
  });

  describe('getBracket', () => {
    it('should return tournament bracket', (done) => {
      apiServiceSpy.get.and.returnValue(of(mockBracket));

      service.getBracket('t-101').subscribe({
        next: (bracket) => {
          expect(bracket.tournamentId).toBe('t-101');
          expect(bracket.matches.length).toBe(1);
          done();
        }
      });
    });
  });

  describe('getMyRegistrations', () => {
    it('should return user registrations', (done) => {
      apiServiceSpy.get.and.returnValue(of([mockRegistration]));

      service.getMyRegistrations().subscribe({
        next: (regs) => {
          expect(regs.length).toBe(1);
          expect(regs[0].tournamentId).toBe('t-101');
          done();
        }
      });
    });
  });

  describe('utilities & helpers', () => {
    it('should format LKR currency properly', () => {
      expect(service.formatLkr(0)).toBe('FREE');
      expect(service.formatLkr(1500)).toBe('LKR 1,500');
    });

    it('should calculate countdown correctly for future date', () => {
      const future = new Date(Date.now() + 1000 * 60 * 60 * 25).toISOString(); // 25 hours
      const cd = service.calculateCountdown(future);
      expect(cd.isPast).toBeFalse();
      expect(cd.days).toBeGreaterThanOrEqual(1);
    });

    it('should return isPast=true for past date', () => {
      const past = new Date(Date.now() - 10000).toISOString();
      const cd = service.calculateCountdown(past);
      expect(cd.isPast).toBeTrue();
    });

    it('should return correct badge info for various statuses', () => {
      expect(service.getStatusBadgeInfo('CANCELLED', false).variant).toBe('occupied');
      expect(service.getStatusBadgeInfo('COMPLETED', false).variant).toBe('info');
      expect(service.getStatusBadgeInfo('ONGOING', false).variant).toBe('accent');
      expect(service.getStatusBadgeInfo('REGISTRATION_OPEN', true).variant).toBe('occupied'); // full
      expect(service.getStatusBadgeInfo('REGISTRATION_OPEN', false).variant).toBe('available');
    });
  });
});
