import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { TournamentsListComponent } from './tournaments-list.component';
import { TournamentService, TournamentViewItem } from '../../../core/services/tournament.service';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationSocketService } from '../../../core/services/notification-socket.service';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { RegistrationResponse } from '../../../shared/models';

describe('TournamentsListComponent', () => {
  let component: TournamentsListComponent;
  let fixture: ComponentFixture<TournamentsListComponent>;
  let tournamentServiceSpy: jasmine.SpyObj<TournamentService>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let notifSocketSpy: jasmine.SpyObj<NotificationSocketService>;
  let toastSpy: jasmine.SpyObj<ToastService>;
  let routerSpy: jasmine.SpyObj<Router>;

  const mockTournaments: TournamentViewItem[] = [
    {
      id: 'tourn-1',
      name: 'Colombo FC 25 Championship',
      gameTitle: 'EA Sports FC 25',
      startDate: new Date(Date.now() + 86400000 * 2).toISOString(),
      registrationDeadline: new Date(Date.now() + 86400000).toISOString(),
      entryFee: 1500,
      maxParticipants: 16,
      participantCount: 8,
      status: 'REGISTRATION_OPEN',
      isRegistrationOpen: true,
      spotsLeft: 8,
      progressPercent: 50,
      isFull: false,
      isClosingSoon: false
    },
    {
      id: 'tourn-2',
      name: 'Valorant Colombo Masters',
      gameTitle: 'Valorant',
      startDate: new Date(Date.now() - 86400000).toISOString(),
      registrationDeadline: new Date(Date.now() - 86400000 * 2).toISOString(),
      entryFee: 5000,
      maxParticipants: 16,
      participantCount: 16,
      status: 'ONGOING',
      isRegistrationOpen: false,
      spotsLeft: 0,
      progressPercent: 100,
      isFull: true,
      isClosingSoon: false
    }
  ];

  const mockReg: RegistrationResponse = {
    id: 'reg-1',
    tournamentId: 'tourn-1',
    userId: 'usr-1',
    status: 'CONFIRMED',
    registeredAt: new Date().toISOString()
  };

  beforeEach(async () => {
    tournamentServiceSpy = jasmine.createSpyObj('TournamentService', [
      'getTournaments',
      'getMyRegistrations',
      'registerForTournament',
      'calculateCountdown',
      'formatLkr',
      'getStatusBadgeInfo',
      'enrichTournament'
    ]);
    authServiceSpy = jasmine.createSpyObj('AuthService', ['isAuthenticated', 'currentUser']);
    notifSocketSpy = jasmine.createSpyObj('NotificationSocketService', ['sendNotification']);
    toastSpy = jasmine.createSpyObj('ToastService', ['success', 'error', 'info', 'warning']);
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    tournamentServiceSpy.getTournaments.and.returnValue(of(mockTournaments));
    tournamentServiceSpy.getMyRegistrations.and.returnValue(of([mockReg]));
    tournamentServiceSpy.calculateCountdown.and.returnValue({
      days: 2,
      hours: 4,
      minutes: 30,
      seconds: 15,
      isPast: false
    });
    tournamentServiceSpy.formatLkr.and.callFake((amt: number) => amt === 0 ? 'FREE' : `LKR ${amt}`);
    tournamentServiceSpy.getStatusBadgeInfo.and.returnValue({ label: 'OPEN', variant: 'available' });
    tournamentServiceSpy.enrichTournament.and.callFake((t: TournamentViewItem) => ({
      ...t,
      spotsLeft: (t.maxParticipants || 16) - (t.participantCount || 0),
      progressPercent: 50,
      isFull: false,
      isClosingSoon: false
    }));

    authServiceSpy.isAuthenticated.and.returnValue(true);
    authServiceSpy.currentUser.and.returnValue({
      userId: 'usr-1',
      sub: 'usr-1',
      role: 'CUSTOMER',
      fullName: 'Kasun Player',
      email: 'kasun@test.lk',
      iat: 1234567890,
      exp: 1234567890 + 3600
    });

    await TestBed.configureTestingModule({
      imports: [TournamentsListComponent],
      providers: [
        { provide: TournamentService, useValue: tournamentServiceSpy },
        { provide: AuthService, useValue: authServiceSpy },
        { provide: NotificationSocketService, useValue: notifSocketSpy },
        { provide: ToastService, useValue: toastSpy },
        { provide: Router, useValue: routerSpy },
        {
          provide: ActivatedRoute,
          useValue: { queryParams: of({}) }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(TournamentsListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and load tournaments', () => {
    expect(component).toBeTruthy();
    expect(component.tournaments().length).toBe(2);
    expect(component.isLoading()).toBeFalse();
  });

  it('should filter tournaments by search query', () => {
    component.onSearchChange('Valorant');
    expect(component.filteredTournaments().length).toBe(1);
    expect(component.filteredTournaments()[0].gameTitle).toBe('Valorant');
  });

  it('should filter tournaments by tab', () => {
    component.setTab('upcoming');
    expect(component.filteredTournaments().length).toBe(1);
    expect(component.filteredTournaments()[0].id).toBe('tourn-1');

    component.setTab('ongoing');
    expect(component.filteredTournaments().length).toBe(1);
    expect(component.filteredTournaments()[0].id).toBe('tourn-2');
  });

  it('should detect when user is registered for a tournament', () => {
    expect(component.isUserRegistered('tourn-1')).toBeTrue();
    expect(component.isUserRegistered('tourn-2')).toBeFalse();
  });

  it('should navigate to tournament details on viewDetails', () => {
    component.viewDetails('tourn-1');
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/tournaments', 'tourn-1']);
  });

  it('should navigate to tournament bracket on viewBracket', () => {
    component.viewBracket('tourn-1');
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/tournaments', 'tourn-1', 'bracket']);
  });

  it('should open quick register modal for unregistered open tournament', () => {
    component.openRegisterModal(mockTournaments[0]);
    expect(component.registerModalOpen()).toBeTrue();
    expect(component.selectedTournamentForRegister()?.id).toBe('tourn-1');
  });

  it('should validate gamer tag on registration submit', () => {
    component.selectedTournamentForRegister.set(mockTournaments[0]);
    component.gamerTag.set('');
    component.submitRegistration();
    expect(component.registrationError()).toContain('Gamer Tag');
  });

  it('should successfully submit registration, show toast, and emit real-time notification', () => {
    tournamentServiceSpy.registerForTournament.and.returnValue(of(mockReg));
    component.selectedTournamentForRegister.set(mockTournaments[0]);
    component.gamerTag.set('ProGamerLK');

    component.submitRegistration();

    expect(tournamentServiceSpy.registerForTournament).toHaveBeenCalledWith('tourn-1', 'ProGamerLK');
    expect(toastSpy.success).toHaveBeenCalled();
    expect(notifSocketSpy.sendNotification).toHaveBeenCalledWith(jasmine.objectContaining({
      type: 'TOURNAMENT_REGISTRATION',
      category: 'TOURNAMENT'
    }));
    expect(component.registerModalOpen()).toBeFalse();
  });
});
