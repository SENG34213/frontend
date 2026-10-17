import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { provideRouter, ActivatedRoute } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';
import { AdminTournamentsComponent } from './admin-tournaments.component';
import { TournamentAdminService } from './tournament-admin.service';
import { NotificationSocketService } from '../../../core/services/notification-socket.service';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import {
  TournamentResponse,
  RegistrationResponse,
  BracketResponse,
  MatchResponse
} from '../../../shared/models';

describe('AdminTournamentsComponent', () => {
  let component: AdminTournamentsComponent;
  let fixture: ComponentFixture<AdminTournamentsComponent>;
  let tournamentAdminServiceSpy: jasmine.SpyObj<TournamentAdminService>;
  let notificationSocketServiceSpy: jasmine.SpyObj<NotificationSocketService>;
  let toastServiceSpy: jasmine.SpyObj<ToastService>;

  const mockTournaments: TournamentResponse[] = [
    {
      id: 'tourn-01',
      name: 'Colombo FC 25 Championship',
      gameTitle: 'EA Sports FC 25',
      startDate: '2026-10-20T10:00:00Z',
      registrationDeadline: '2026-10-18T23:59:00Z',
      maxParticipants: 32,
      participantCount: 18,
      entryFee: 1500,
      status: 'REGISTRATION_OPEN',
      isRegistrationOpen: true
    },
    {
      id: 'tourn-02',
      name: 'Valorant Colombo Masters',
      gameTitle: 'Valorant',
      startDate: '2026-10-16T14:00:00Z',
      registrationDeadline: '2026-10-14T23:59:00Z',
      maxParticipants: 16,
      participantCount: 16,
      entryFee: 5000,
      status: 'ONGOING',
      isRegistrationOpen: false
    },
    {
      id: 'tourn-03',
      name: 'Tekken 8 Iron Fist Colombo',
      gameTitle: 'Tekken 8',
      startDate: '2026-11-01T11:00:00Z',
      registrationDeadline: '2026-10-28T23:59:00Z',
      maxParticipants: 16,
      participantCount: 4,
      entryFee: 1000,
      status: 'UPCOMING',
      isRegistrationOpen: true
    },
    {
      id: 'tourn-04',
      name: 'Apex Legends Trio Clash',
      gameTitle: 'Apex Legends',
      startDate: '2026-09-10T10:00:00Z',
      registrationDeadline: '2026-09-08T23:59:00Z',
      maxParticipants: 20,
      participantCount: 20,
      entryFee: 2500,
      status: 'COMPLETED',
      isRegistrationOpen: false
    }
  ];

  const mockRegistrations: RegistrationResponse[] = [
    {
      id: 'reg-01',
      tournamentId: 'tourn-01',
      userId: 'usr-01',
      userName: 'Kasun Perera',
      gamerTag: 'Kasun_FC',
      status: 'CONFIRMED',
      paymentId: 'pay-01',
      registeredAt: '2026-10-15T08:00:00Z'
    },
    {
      id: 'reg-02',
      tournamentId: 'tourn-01',
      userId: 'usr-02',
      userName: 'Nimal Silva',
      gamerTag: 'NimalStriker',
      status: 'PENDING_PAYMENT',
      registeredAt: '2026-10-15T09:00:00Z'
    }
  ];

  const mockBracket: BracketResponse = {
    id: 'brk-01',
    tournamentId: 'tourn-01',
    generatedAt: '2026-10-15T10:00:00Z',
    matches: [
      {
        id: 'm-01',
        round: 1,
        participant1Id: 'p-01',
        participant1Name: 'Team Alpha',
        participant2Id: 'p-02',
        participant2Name: 'Team Beta',
        status: 'SCHEDULED'
      },
      {
        id: 'm-02',
        round: 2,
        participant1Id: undefined,
        participant2Id: undefined,
        status: 'SCHEDULED'
      }
    ]
  };

  beforeEach(async () => {
    tournamentAdminServiceSpy = jasmine.createSpyObj('TournamentAdminService', [
      'getTournaments',
      'getTournamentById',
      'createTournament',
      'updateStatus',
      'cancelTournament',
      'getRegistrations',
      'generateBracket',
      'getBracket',
      'recordMatchResult',
      'sendReminders'
    ]);

    tournamentAdminServiceSpy.getTournaments.and.returnValue(of(mockTournaments));
    tournamentAdminServiceSpy.createTournament.and.returnValue(
      of({
        id: 'tourn-new',
        name: 'Rocket League Open',
        gameTitle: 'Rocket League',
        startDate: '2026-11-10T10:00:00Z',
        registrationDeadline: '2026-11-08T10:00:00Z',
        maxParticipants: 16,
        participantCount: 0,
        entryFee: 1500,
        status: 'UPCOMING'
      })
    );
    tournamentAdminServiceSpy.updateStatus.and.returnValue(
      of({ ...mockTournaments[0], status: 'ONGOING' })
    );
    tournamentAdminServiceSpy.cancelTournament.and.returnValue(
      of({ ...mockTournaments[0], status: 'CANCELLED' })
    );
    tournamentAdminServiceSpy.getRegistrations.and.returnValue(of(mockRegistrations));
    tournamentAdminServiceSpy.getBracket.and.returnValue(of(mockBracket));
    tournamentAdminServiceSpy.generateBracket.and.returnValue(of(mockBracket));
    tournamentAdminServiceSpy.recordMatchResult.and.returnValue(
      of({
        id: 'm-01',
        round: 1,
        participant1Id: 'p-01',
        participant1Name: 'Team Alpha',
        participant2Id: 'p-02',
        participant2Name: 'Team Beta',
        winnerId: 'p-01',
        winnerName: 'Team Alpha',
        status: 'COMPLETED'
      })
    );
    tournamentAdminServiceSpy.sendReminders.and.returnValue(of(void 0));

    toastServiceSpy = jasmine.createSpyObj('ToastService', ['show', 'success', 'error', 'warning', 'info']);
    notificationSocketServiceSpy = jasmine.createSpyObj('NotificationSocketService', ['sendNotification']);

    await TestBed.configureTestingModule({
      imports: [AdminTournamentsComponent, ReactiveFormsModule],
      providers: [
        provideRouter([]),
        { provide: TournamentAdminService, useValue: tournamentAdminServiceSpy },
        { provide: NotificationSocketService, useValue: notificationSocketServiceSpy },
        { provide: ToastService, useValue: toastServiceSpy },
        {
          provide: ActivatedRoute,
          useValue: {
            queryParams: of({})
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AdminTournamentsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('TC-FE-TRN-01: should create component and initialize tournaments list', () => {
    expect(component).toBeTruthy();
    expect(tournamentAdminServiceSpy.getTournaments).toHaveBeenCalled();
    expect(component.tournaments().length).toBe(4);
    expect(component.isLoading()).toBeFalse();
  });

  it('TC-FE-TRN-02: should compute KPI metrics correctly', () => {
    expect(component.totalTournaments()).toBe(4);
    expect(component.ongoingCount()).toBe(1);
    expect(component.openRegistrationCount()).toBe(1);
    expect(component.totalEnrolledPlayers()).toBe(58); // 18 + 16 + 4 + 20
  });

  it('TC-FE-TRN-03: should filter tournaments by search query', () => {
    component.onSearchInput('Valorant');
    expect(component.filteredTournaments().length).toBe(1);
    expect(component.filteredTournaments()[0].name).toBe('Valorant Colombo Masters');

    component.onSearchInput('EA Sports');
    expect(component.filteredTournaments().length).toBe(1);

    component.onSearchInput('');
    expect(component.filteredTournaments().length).toBe(4);
  });

  it('TC-FE-TRN-04: should filter tournaments by status', () => {
    component.onStatusFilterChange('REGISTRATION_OPEN');
    expect(component.filteredTournaments().length).toBe(1);
    expect(component.filteredTournaments()[0].status).toBe('REGISTRATION_OPEN');

    component.onStatusFilterChange('ONGOING');
    expect(component.filteredTournaments().length).toBe(1);

    component.onStatusFilterChange('COMPLETED');
    expect(component.filteredTournaments().length).toBe(1);
  });

  it('TC-FE-TRN-05: should sort tournaments by fee and start date', () => {
    component.onSortChange('fee_asc');
    expect(component.filteredTournaments()[0].entryFee).toBe(1000);
    expect(component.filteredTournaments()[3].entryFee).toBe(5000);

    component.onSortChange('fee_desc');
    expect(component.filteredTournaments()[0].entryFee).toBe(5000);

    component.onSortChange('date_asc');
    expect(component.filteredTournaments()[0].name).toBe('Apex Legends Trio Clash');
  });

  it('TC-FE-TRN-06: should open create tournament modal and reset form', () => {
    component.openCreateModal();
    expect(component.createModalOpen()).toBeTrue();
    expect(component.createForm.get('name')?.value).toBe('');
    expect(component.createForm.get('entryFee')?.value).toBe(1500);
  });

  it('TC-FE-TRN-07: should submit valid tournament form and call createTournament', () => {
    component.openCreateModal();
    component.createForm.patchValue({
      name: 'Rocket League Open',
      gameTitle: 'Rocket League',
      startDate: '2026-11-10T10:00',
      registrationDeadline: '2026-11-08T10:00',
      entryFee: 1500,
      maxParticipants: 16
    });

    component.submitCreate();

    expect(tournamentAdminServiceSpy.createTournament).toHaveBeenCalled();
    expect(toastServiceSpy.success).toHaveBeenCalledWith(jasmine.stringMatching(/created and published/i));
    expect(component.createModalOpen()).toBeFalse();
  });

  it('TC-FE-TRN-08: should not submit invalid tournament form', () => {
    component.openCreateModal();
    component.createForm.patchValue({
      name: '', // Invalid
      gameTitle: '' // Invalid
    });

    component.submitCreate();

    expect(tournamentAdminServiceSpy.createTournament).not.toHaveBeenCalled();
    expect(component.createForm.invalid).toBeTrue();
  });

  it('TC-FE-TRN-09: should open status modal and submit updated status', () => {
    const t = mockTournaments[0];
    component.openStatusModal(t);
    expect(component.statusModalOpen()).toBeTrue();
    expect(component.selectedTournamentForStatus()).toEqual(t);

    component.statusForm.patchValue({ status: 'ONGOING' });
    component.submitStatusChange();

    expect(tournamentAdminServiceSpy.updateStatus).toHaveBeenCalledWith('tourn-01', 'ONGOING');
    expect(toastServiceSpy.success).toHaveBeenCalledWith(jasmine.stringMatching(/status changed/i));
    expect(component.statusModalOpen()).toBeFalse();
  });

  it('TC-FE-TRN-10: should open cancel modal and cancel tournament', () => {
    const t = mockTournaments[0];
    component.openCancelModal(t);
    expect(component.cancelModalOpen()).toBeTrue();
    expect(component.selectedTournamentForCancel()).toEqual(t);

    component.confirmCancel();

    expect(tournamentAdminServiceSpy.cancelTournament).toHaveBeenCalledWith('tourn-01');
    expect(toastServiceSpy.success).toHaveBeenCalledWith(jasmine.stringMatching(/cancelled/i));
    expect(component.cancelModalOpen()).toBeFalse();
  });

  it('TC-FE-TRN-11: should open registrations modal and load participant list', () => {
    const t = mockTournaments[0];
    component.openRegistrations(t);

    expect(component.registrationsModalOpen()).toBeTrue();
    expect(component.selectedTournamentForRegistrations()).toEqual(t);
    expect(tournamentAdminServiceSpy.getRegistrations).toHaveBeenCalledWith('tourn-01');
    expect(component.registrationsList().length).toBe(2);
    expect(component.registrationsList()[0].gamerTag).toBe('Kasun_FC');
  });

  it('TC-FE-TRN-12: should open bracket modal and load bracket', () => {
    const t = mockTournaments[0];
    component.openBracket(t);

    expect(component.bracketModalOpen()).toBeTrue();
    expect(component.selectedTournamentForBracket()).toEqual(t);
    expect(tournamentAdminServiceSpy.getBracket).toHaveBeenCalledWith('tourn-01');
    expect(component.activeBracket()).toEqual(mockBracket);
    expect(component.bracketRounds().length).toBe(2);
  });

  it('TC-FE-TRN-13: should trigger single-elimination bracket generation', () => {
    const t = mockTournaments[0];
    component.openBracket(t);

    component.triggerGenerateBracket();

    expect(tournamentAdminServiceSpy.generateBracket).toHaveBeenCalledWith('tourn-01');
    expect(toastServiceSpy.success).toHaveBeenCalledWith(jasmine.stringMatching(/generated/i));
  });

  it('TC-FE-TRN-14: should record match winner and call recordMatchResult', () => {
    const t = mockTournaments[0];
    component.openBracket(t);
    const match = mockBracket.matches[0];

    component.recordMatchWinner(match, 'p-01');

    expect(tournamentAdminServiceSpy.recordMatchResult).toHaveBeenCalledWith('tourn-01', 'm-01', 'p-01');
    expect(toastServiceSpy.success).toHaveBeenCalledWith(jasmine.stringMatching(/recorded/i));
  });

  it('TC-FE-TRN-15: should dispatch pre-tournament reminders', () => {
    const t = mockTournaments[0];
    component.sendReminders(t);

    expect(tournamentAdminServiceSpy.sendReminders).toHaveBeenCalledWith('tourn-01');
    expect(toastServiceSpy.success).toHaveBeenCalledWith(jasmine.stringMatching(/reminders sent/i));
  });

  it('TC-FE-TRN-16: should handle error state when loading tournaments fails', () => {
    tournamentAdminServiceSpy.getTournaments.and.returnValue(throwError(() => new Error('Service down')));

    component.loadTournaments();

    expect(component.isLoading()).toBeFalse();
    expect(component.errorMessage()).toBe('Service down');
    expect(toastServiceSpy.error).toHaveBeenCalled();
  });

  it('TC-FE-TRN-17: should clear filters back to defaults', () => {
    component.onSearchInput('Tekken');
    component.onStatusFilterChange('UPCOMING');
    component.onSortChange('fee_desc');

    component.clearFilters();

    expect(component.searchQuery()).toBe('');
    expect(component.filterStatus()).toBe('');
    expect(component.sortBy()).toBe('date_asc');
    expect(component.filteredTournaments().length).toBe(4);
  });
});
