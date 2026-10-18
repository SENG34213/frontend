import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { TournamentBracketComponent } from './tournament-bracket.component';
import { TournamentService, TournamentViewItem } from '../../../core/services/tournament.service';
import { BracketResponse } from '../../../shared/models';

describe('TournamentBracketComponent', () => {
  let component: TournamentBracketComponent;
  let fixture: ComponentFixture<TournamentBracketComponent>;
  let tournamentServiceSpy: jasmine.SpyObj<TournamentService>;
  let routerSpy: jasmine.SpyObj<Router>;

  const mockTournament: TournamentViewItem = {
    id: 't-101',
    name: 'Colombo FC 25 Championship',
    gameTitle: 'EA Sports FC 25',
    startDate: new Date().toISOString(),
    registrationDeadline: new Date().toISOString(),
    entryFee: 1500,
    maxParticipants: 8,
    participantCount: 8,
    status: 'COMPLETED',
    isRegistrationOpen: false,
    spotsLeft: 0,
    progressPercent: 100,
    isFull: true,
    isClosingSoon: false
  };

  const mockBracket: BracketResponse = {
    id: 'brk-101',
    tournamentId: 't-101',
    generatedAt: new Date().toISOString(),
    matches: [
      {
        id: 'm-1',
        round: 1,
        participant1Id: 'usr-p1',
        participant1Name: 'Kasun Player',
        participant2Id: 'usr-p2',
        participant2Name: 'Nimal Striker',
        winnerId: 'usr-p1',
        winnerName: 'Kasun Player',
        status: 'COMPLETED'
      },
      {
        id: 'm-2',
        round: 1,
        participant1Id: 'usr-p3',
        participant1Name: 'Dinesh Gamer',
        participant2Id: 'usr-p4',
        participant2Name: 'Sunil LK',
        winnerId: 'usr-p3',
        winnerName: 'Dinesh Gamer',
        status: 'COMPLETED'
      },
      {
        id: 'm-3',
        round: 2,
        participant1Id: 'usr-p1',
        participant1Name: 'Kasun Player',
        participant2Id: 'usr-p3',
        participant2Name: 'Dinesh Gamer',
        winnerId: 'usr-p1',
        winnerName: 'Kasun Player',
        status: 'COMPLETED'
      }
    ]
  };

  beforeEach(async () => {
    tournamentServiceSpy = jasmine.createSpyObj('TournamentService', [
      'getTournamentById',
      'getBracket'
    ]);
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    tournamentServiceSpy.getTournamentById.and.returnValue(of(mockTournament));
    tournamentServiceSpy.getBracket.and.returnValue(of(mockBracket));

    await TestBed.configureTestingModule({
      imports: [TournamentBracketComponent],
      providers: [
        { provide: TournamentService, useValue: tournamentServiceSpy },
        { provide: Router, useValue: routerSpy },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: {
                get: (key: string) => key === 'id' ? 't-101' : null
              }
            }
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(TournamentBracketComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and load tournament bracket', () => {
    expect(component).toBeTruthy();
    expect(component.bracket()?.id).toBe('brk-101');
    expect(component.isLoading()).toBeFalse();
  });

  it('should group matches into rounds correctly', () => {
    const rounds = component.roundGroups();
    expect(rounds.length).toBe(2);
    expect(rounds[0].roundNumber).toBe(1);
    expect(rounds[0].matches.length).toBe(2);
    expect(rounds[1].roundNumber).toBe(2);
    expect(rounds[1].roundName).toBe('Grand Finals');
    expect(rounds[1].matches.length).toBe(1);
  });

  it('should crown champion from the final round winner', () => {
    expect(component.champion()).toBeTruthy();
    expect(component.champion()?.id).toBe('usr-p1');
    expect(component.champion()?.name).toBe('Kasun Player');
  });

  it('should identify winner in a match', () => {
    const match = mockBracket.matches[0];
    expect(component.isWinner(match, 'usr-p1')).toBeTrue();
    expect(component.isWinner(match, 'usr-p2')).toBeFalse();
  });

  it('should navigate back to tournament details on goBack', () => {
    component.goBack();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/tournaments', 't-101']);
  });
});
