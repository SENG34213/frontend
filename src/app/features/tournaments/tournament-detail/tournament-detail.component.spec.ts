import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { TournamentDetailComponent } from './tournament-detail.component';
import { TournamentService, TournamentViewItem } from '../../../core/services/tournament.service';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationSocketService } from '../../../core/services/notification-socket.service';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { RegistrationResponse, BracketResponse } from '../../../shared/models';

describe('TournamentDetailComponent', () => {
  let component: TournamentDetailComponent;
  let fixture: ComponentFixture<TournamentDetailComponent>;
  let tournamentServiceSpy: jasmine.SpyObj<TournamentService>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let notifSocketSpy: jasmine.SpyObj<NotificationSocketService>;
  let toastSpy: jasmine.SpyObj<ToastService>;
  let routerSpy: jasmine.SpyObj<Router>;

  const mockTournament: TournamentViewItem = {
    id: 't-101',
    name: 'Colombo FC 25 Championship',
    gameTitle: 'EA Sports FC 25',
    startDate: new Date(Date.now() + 86400000 * 3).toISOString(),
    registrationDeadline: new Date(Date.now() + 86400000 * 2).toISOString(),
    entryFee: 1500,
    maxParticipants: 16,
    participantCount: 6,
    status: 'REGISTRATION_OPEN',
    isRegistrationOpen: true,
    spotsLeft: 10,
    progressPercent: 37,
    isFull: false,
    isClosingSoon: false
  };

  const mockRegistration: RegistrationResponse = {
    id: 'reg-101',
    tournamentId: 't-101',
    userId: 'usr-1',
    status: 'CONFIRMED',
    paymentId: 'pay-999',
    registeredAt: new Date().toISOString()
  };

  const mockBracket: BracketResponse = {
    id: 'brk-101',
    tournamentId: 't-101',
    generatedAt: new Date().toISOString(),
    matches: []
  };

  beforeEach(async () => {
    tournamentServiceSpy = jasmine.createSpyObj('TournamentService', [
      'getTournamentById',
      'getMyRegistrations',
      'getBracket',
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

    tournamentServiceSpy.getTournamentById.and.returnValue(of(mockTournament));
    tournamentServiceSpy.getMyRegistrations.and.returnValue(of([]));
    tournamentServiceSpy.getBracket.and.returnValue(of(mockBracket));
    tournamentServiceSpy.calculateCountdown.and.returnValue({
      days: 3,
      hours: 0,
      minutes: 0,
      seconds: 0,
      isPast: false
    });
    tournamentServiceSpy.formatLkr.and.callFake((amt: number) => amt === 0 ? 'FREE' : `LKR ${amt}`);
    tournamentServiceSpy.getStatusBadgeInfo.and.returnValue({ label: 'REGISTRATION OPEN', variant: 'available' });
    tournamentServiceSpy.enrichTournament.and.callFake((t: TournamentViewItem) => ({
      ...t,
      spotsLeft: (t.maxParticipants || 16) - (t.participantCount || 0),
      progressPercent: 40,
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
      imports: [TournamentDetailComponent],
      providers: [
        { provide: TournamentService, useValue: tournamentServiceSpy },
        { provide: AuthService, useValue: authServiceSpy },
        { provide: NotificationSocketService, useValue: notifSocketSpy },
        { provide: ToastService, useValue: toastSpy },
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

    fixture = TestBed.createComponent(TournamentDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and load tournament details', () => {
    expect(component).toBeTruthy();
    expect(component.tournament()?.id).toBe('t-101');
    expect(component.isLoading()).toBeFalse();
  });

  it('should indicate user can register when not registered and open', () => {
    expect(component.isRegistered()).toBeFalse();
    expect(component.canRegister()).toBeTrue();
  });

  it('should validate form fields on registration submit', () => {
    component.gamerTag.set('');
    component.agreedToRules.set(false);
    component.submitRegistration();
    expect(component.registrationError()).toContain('Gamer Tag');

    component.gamerTag.set('Striker');
    component.submitRegistration();
    expect(component.registrationError()).toContain('rules');
  });

  it('should complete registration successfully and emit real-time notification', () => {
    tournamentServiceSpy.registerForTournament.and.returnValue(of(mockRegistration));
    component.gamerTag.set('Striker');
    component.agreedToRules.set(true);

    component.submitRegistration();

    expect(tournamentServiceSpy.registerForTournament).toHaveBeenCalledWith('t-101', 'Striker');
    expect(component.isRegistered()).toBeTrue();
    expect(toastSpy.success).toHaveBeenCalled();
    expect(notifSocketSpy.sendNotification).toHaveBeenCalledWith(jasmine.objectContaining({
      type: 'TOURNAMENT_REGISTRATION',
      category: 'TOURNAMENT'
    }));
  });

  it('should navigate back to tournament list', () => {
    component.goBack();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/tournaments']);
  });

  it('should navigate to bracket page', () => {
    component.goToBracket();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/tournaments', 't-101', 'bracket']);
  });
});
