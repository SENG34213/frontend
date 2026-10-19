import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { MyTournamentsComponent } from './my-tournaments.component';
import { TournamentService, TournamentViewItem } from '../../core/services/tournament.service';
import { RegistrationResponse } from '../../shared/models/tournament.model';

describe('MyTournamentsComponent', () => {
  let component: MyTournamentsComponent;
  let fixture: ComponentFixture<MyTournamentsComponent>;
  let tournamentServiceSpy: jasmine.SpyObj<TournamentService>;

  const mockRegistrations: RegistrationResponse[] = [
    {
      id: 'reg-1',
      tournamentId: 't-1',
      tournamentName: 'Colombo FC 25 Championship',
      userId: 'usr-1',
      status: 'CONFIRMED',
      registeredAt: '2026-10-18T10:00:00Z',
      gamerTag: 'Striker99'
    },
    {
      id: 'reg-2',
      tournamentId: 't-2',
      tournamentName: 'Tekken 8 Iron Fist Colombo',
      userId: 'usr-1',
      status: 'CONFIRMED',
      registeredAt: '2026-10-01T10:00:00Z',
      gamerTag: 'Striker99'
    }
  ];

  const mockTournaments: TournamentViewItem[] = [
    {
      id: 't-1',
      name: 'Colombo FC 25 Championship',
      gameTitle: 'EA SPORTS FC 25',
      startDate: '2026-10-30T10:00:00Z',
      entryFee: 1500,
      maxParticipants: 16,
      participantCount: 12,
      registrationDeadline: '2026-10-29T23:59:00Z',
      status: 'UPCOMING',
      spotsLeft: 4,
      progressPercent: 75,
      isFull: false,
      isClosingSoon: false
    },
    {
      id: 't-2',
      name: 'Tekken 8 Iron Fist Colombo',
      gameTitle: 'TEKKEN 8',
      startDate: '2026-10-05T10:00:00Z',
      entryFee: 1000,
      maxParticipants: 16,
      participantCount: 16,
      registrationDeadline: '2026-10-04T23:59:00Z',
      status: 'COMPLETED',
      spotsLeft: 0,
      progressPercent: 100,
      isFull: true,
      isClosingSoon: false
    }
  ];

  beforeEach(async () => {
    tournamentServiceSpy = jasmine.createSpyObj('TournamentService', [
      'getMyRegistrations',
      'getTournaments'
    ]);

    tournamentServiceSpy.getMyRegistrations.and.returnValue(of(mockRegistrations));
    tournamentServiceSpy.getTournaments.and.returnValue(of(mockTournaments));

    await TestBed.configureTestingModule({
      imports: [MyTournamentsComponent],
      providers: [
        provideRouter([]),
        { provide: TournamentService, useValue: tournamentServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(MyTournamentsComponent);
    component = fixture.componentInstance;
  });

  it('should create the component', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should fetch registrations and tournaments in single forkJoin and split into upcoming vs played', () => {
    fixture.detectChanges();

    expect(tournamentServiceSpy.getMyRegistrations).toHaveBeenCalledTimes(1);
    expect(tournamentServiceSpy.getTournaments).toHaveBeenCalledTimes(1);

    expect(component.isLoading()).toBeFalse();
    expect(component.allItems().length).toBe(2);

    expect(component.upcomingList().length).toBe(1);
    expect(component.playedList().length).toBe(1);

    expect(component.tabs()[0].badge).toBe(1);
    expect(component.tabs()[1].badge).toBe(1);
  });

  it('should show upcoming tournament on upcoming tab', () => {
    fixture.detectChanges();
    expect(component.activeTab()).toBe('upcoming');
    expect(component.currentList().length).toBe(1);
    expect(component.currentList()[0].tournamentName).toBe('Colombo FC 25 Championship');

    const card = fixture.nativeElement.querySelector('.tournament-card');
    expect(card.textContent).toContain('Colombo FC 25 Championship');
    expect(card.textContent).toContain('EA SPORTS FC 25');
  });

  it('should switch to played tab and show completed tournament', () => {
    fixture.detectChanges();
    component.onTabChange('played');
    fixture.detectChanges();

    expect(component.activeTab()).toBe('played');
    expect(component.currentList().length).toBe(1);
    expect(component.currentList()[0].tournamentName).toBe('Tekken 8 Iron Fist Colombo');

    const card = fixture.nativeElement.querySelector('.tournament-card');
    expect(card.textContent).toContain('Tekken 8 Iron Fist Colombo');
  });

  it('should display empty state when registrations are empty', () => {
    tournamentServiceSpy.getMyRegistrations.and.returnValue(of([]));
    tournamentServiceSpy.getTournaments.and.returnValue(of([]));
    fixture.detectChanges();

    expect(component.currentList().length).toBe(0);
    const emptyState = fixture.nativeElement.querySelector('gc-empty-state');
    expect(emptyState).toBeTruthy();
  });

  it('should handle API errors and show retry state', () => {
    tournamentServiceSpy.getMyRegistrations.and.returnValue(throwError(() => new Error('Error')));
    fixture.detectChanges();

    expect(component.hasError()).toBeTrue();
    expect(component.isLoading()).toBeFalse();

    tournamentServiceSpy.getMyRegistrations.and.returnValue(of(mockRegistrations));
    component.loadMyTournaments();
    fixture.detectChanges();

    expect(component.hasError()).toBeFalse();
    expect(component.allItems().length).toBe(2);
  });
});
