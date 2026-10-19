import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { TournamentAdminService } from './tournament-admin.service';
import { ApiService } from '../../../core/services/api.service';
import { TournamentResponse, TournamentRequest, RegistrationResponse, BracketResponse, MatchResponse } from '../../../shared/models';

describe('TournamentAdminService', () => {
  let service: TournamentAdminService;
  let apiSpy: jasmine.SpyObj<ApiService>;

  const mockTournament: TournamentResponse = {
    id: 't-101',
    name: 'FC 25 Open',
    gameTitle: 'EA Sports FC 25',
    startDate: '2026-10-25T10:00:00Z',
    registrationDeadline: '2026-10-24T18:00:00Z',
    entryFee: 1000,
    maxParticipants: 16,
    participantCount: 8,
    status: 'REGISTRATION_OPEN',
    isRegistrationOpen: true
  };

  beforeEach(() => {
    apiSpy = jasmine.createSpyObj('ApiService', ['get', 'post', 'patch']);
    TestBed.configureTestingModule({
      providers: [
        TournamentAdminService,
        { provide: ApiService, useValue: apiSpy }
      ]
    });
    service = TestBed.inject(TournamentAdminService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should get all tournaments and normalize title and participantCount', (done) => {
    apiSpy.get.and.returnValue(of([
      mockTournament,
      {
        id: 't-102',
        title: 'Valorant Cup',
        gameTitle: 'Valorant',
        startDate: '2026-10-26T10:00:00Z',
        registrationDeadline: '2026-10-25T18:00:00Z',
        entryFee: 500,
        maxParticipants: 8,
        currentParticipants: 4,
        status: 'UPCOMING',
        isRegistrationOpen: true
      } as unknown as TournamentResponse
    ]));

    service.getTournaments().subscribe(list => {
      expect(list.length).toBe(2);
      expect(list[0].name).toBe('FC 25 Open');
      expect(list[1].name).toBe('Valorant Cup');
      expect(list[1].participantCount).toBe(4);
      done();
    });
  });

  it('should get tournament by ID and normalize title', (done) => {
    apiSpy.get.and.returnValue(of(mockTournament));

    service.getTournamentById('t-101').subscribe(res => {
      expect(res.id).toBe('t-101');
      expect(apiSpy.get).toHaveBeenCalledWith('/tournaments/t-101');
      done();
    });
  });

  it('should create tournament via POST', (done) => {
    const req: TournamentRequest = {
      name: 'New Tournament',
      gameTitle: 'Tekken 8',
      startDate: '2026-10-30T10:00:00Z',
      registrationDeadline: '2026-10-29T18:00:00Z',
      entryFee: 1200,
      maxParticipants: 16
    };

    apiSpy.post.and.returnValue(of(mockTournament));

    service.createTournament(req).subscribe(res => {
      expect(res.id).toBe('t-101');
      expect(apiSpy.post).toHaveBeenCalledWith('/tournaments', req);
      done();
    });
  });

  it('should update tournament status via PATCH', (done) => {
    apiSpy.patch.and.returnValue(of({ ...mockTournament, status: 'IN_PROGRESS' }));

    service.updateStatus('t-101', 'IN_PROGRESS').subscribe(res => {
      expect(res.status).toBe('IN_PROGRESS');
      expect(apiSpy.patch).toHaveBeenCalledWith('/tournaments/t-101/status', { status: 'IN_PROGRESS' });
      done();
    });
  });

  it('should cancel tournament via POST', (done) => {
    apiSpy.post.and.returnValue(of({ ...mockTournament, status: 'CANCELLED' }));

    service.cancelTournament('t-101').subscribe(res => {
      expect(res.status).toBe('CANCELLED');
      expect(apiSpy.post).toHaveBeenCalledWith('/tournaments/t-101/cancel', {});
      done();
    });
  });

  it('should get registrations via GET', (done) => {
    const mockRegs: RegistrationResponse[] = [
      { id: 'reg-1', tournamentId: 't-101', tournamentName: 'FC 25', userId: 'usr-1', status: 'CONFIRMED', registeredAt: '2026-10-19T00:00:00Z' }
    ];
    apiSpy.get.and.returnValue(of(mockRegs));

    service.getRegistrations('t-101').subscribe(regs => {
      expect(regs.length).toBe(1);
      expect(apiSpy.get).toHaveBeenCalledWith('/tournaments/t-101/registrations');
      done();
    });
  });

  it('should generate bracket via POST', (done) => {
    const mockBracket: BracketResponse = {
      id: 'brk-1',
      tournamentId: 't-101',
      matches: [],
      generatedAt: '2026-10-19T00:00:00Z'
    };
    apiSpy.post.and.returnValue(of(mockBracket));

    service.generateBracket('t-101').subscribe(bracket => {
      expect(bracket.id).toBe('brk-1');
      expect(apiSpy.post).toHaveBeenCalledWith('/tournaments/t-101/bracket/generate', {});
      done();
    });
  });

  it('should get bracket via GET', (done) => {
    const mockBracket: BracketResponse = {
      id: 'brk-1',
      tournamentId: 't-101',
      matches: [],
      generatedAt: '2026-10-19T00:00:00Z'
    };
    apiSpy.get.and.returnValue(of(mockBracket));

    service.getBracket('t-101').subscribe(bracket => {
      expect(bracket.id).toBe('brk-1');
      expect(apiSpy.get).toHaveBeenCalledWith('/tournaments/t-101/bracket');
      done();
    });
  });

  it('should record match result via PATCH', (done) => {
    const mockMatch: MatchResponse = {
      id: 'm-1',
      round: 1,
      participant1Id: 'usr-1',
      participant2Id: 'usr-2',
      status: 'COMPLETED',
      winnerId: 'usr-1'
    };
    apiSpy.patch.and.returnValue(of(mockMatch));

    service.recordMatchResult('t-101', 'm-1', 'usr-1').subscribe(res => {
      expect(res.winnerId).toBe('usr-1');
      expect(apiSpy.patch).toHaveBeenCalledWith('/tournaments/t-101/bracket/matches/m-1/result', { winnerId: 'usr-1' });
      done();
    });
  });

  it('should send reminders via POST', (done) => {
    apiSpy.post.and.returnValue(of(undefined));

    service.sendReminders('t-101').subscribe(() => {
      expect(apiSpy.post).toHaveBeenCalledWith('/tournaments/t-101/notify-reminders', {});
      done();
    });
  });
});
