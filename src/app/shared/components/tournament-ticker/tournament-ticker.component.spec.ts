import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError, Subject } from 'rxjs';
import {
  TournamentTickerComponent,
  computeSpotsLeft,
  formatTournamentDate,
  formatLkr,
  formatSpots,
  filterAndSortUpcomingTournaments
} from './tournament-ticker.component';
import { TournamentService, TournamentViewItem } from '../../../core/services/tournament.service';
import { TournamentResponse, TournamentStatus } from '../../../shared/models';

describe('TournamentTickerComponent', () => {
  let component: TournamentTickerComponent;
  let fixture: ComponentFixture<TournamentTickerComponent>;
  let tournamentServiceSpy: jasmine.SpyObj<TournamentService>;

  const baseTournament = (overrides: Partial<TournamentViewItem> = {}): TournamentViewItem => ({
    id: 'test-1',
    name: 'Test Tournament',
    gameTitle: 'Tekken 8',
    startDate: new Date(Date.now() + 86400000 * 2).toISOString(), // 2 days in future
    endDate: new Date(Date.now() + 86400000 * 2 + 18000000).toISOString(),
    entryFee: 1500,
    maxParticipants: 16,
    participantCount: 4,
    registrationDeadline: new Date(Date.now() + 86400000).toISOString(),
    status: 'UPCOMING' as TournamentStatus,
    createdByAdminId: 'admin-1',
    createdAt: new Date().toISOString(),
    isRegistrationOpen: true,
    spotsLeft: 12,
    progressPercent: 25,
    isFull: false,
    isClosingSoon: false,
    ...overrides
  });

  beforeEach(async () => {
    tournamentServiceSpy = jasmine.createSpyObj('TournamentService', ['getTournaments']);

    await TestBed.configureTestingModule({
      imports: [TournamentTickerComponent],
      providers: [
        provideRouter([]),
        { provide: TournamentService, useValue: tournamentServiceSpy }
      ]
    }).compileComponents();
  });

  // ── Helper Unit Tests ──────────────────────────────────────────────────────

  describe('computeSpotsLeft', () => {
    it('should compute remaining spots correctly', () => {
      expect(computeSpotsLeft(16, 4)).toBe(12);
      expect(computeSpotsLeft(32, 32)).toBe(0);
    });

    it('should clamp to 0 if participantCount exceeds max', () => {
      expect(computeSpotsLeft(16, 20)).toBe(0);
      expect(computeSpotsLeft(0, 5)).toBe(0);
    });

    it('should handle undefined/falsy inputs safely', () => {
      expect(computeSpotsLeft(0, 0)).toBe(0);
      expect(computeSpotsLeft(16, undefined as unknown as number)).toBe(16);
    });
  });

  describe('formatSpots', () => {
    it('should format 0 spots as 0 spots left', () => {
      expect(formatSpots(0)).toBe('0 spots left');
    });

    it('should format 1 spot as 1 spot left', () => {
      expect(formatSpots(1)).toBe('1 spot left');
    });

    it('should format multiple spots as N spots left', () => {
      expect(formatSpots(12)).toBe('12 spots left');
    });
  });

  describe('formatLkr', () => {
    it('should format amounts in LKR currency style', () => {
      expect(formatLkr(1500)).toBe('LKR 1,500');
      expect(formatLkr(2500)).toBe('LKR 2,500');
    });

    it('should format 0 or null as FREE', () => {
      expect(formatLkr(0)).toBe('FREE');
    });
  });

  describe('formatTournamentDate', () => {
    it('should format ISO date in Asia/Colombo time', () => {
      // 2026-10-25T13:30:00Z is 2026-10-25 19:00:00 in Asia/Colombo (+05:30)
      const formatted = formatTournamentDate('2026-10-25T13:30:00Z');
      expect(formatted).toContain('Sun');
      expect(formatted).toContain('25');
      expect(formatted).toContain('Oct');
      expect(formatted).toContain('7:00 PM');
    });

    it('should return empty string on invalid date', () => {
      expect(formatTournamentDate('invalid-date')).toBe('');
    });
  });

  describe('filterAndSortUpcomingTournaments', () => {
    const fixedNow = new Date('2026-10-20T12:00:00Z').getTime();

    it('should include UPCOMING and REGISTRATION_OPEN with future startDate', () => {
      const list: TournamentResponse[] = [
        baseTournament({
          id: 't1',
          name: 'Upcoming Tourney',
          status: 'UPCOMING',
          startDate: '2026-10-22T10:00:00Z'
        }),
        baseTournament({
          id: 't2',
          name: 'Reg Open Tourney',
          status: 'REGISTRATION_OPEN',
          startDate: '2026-10-23T10:00:00Z'
        })
      ];

      const result = filterAndSortUpcomingTournaments(list, fixedNow);
      expect(result.length).toBe(2);
      expect(result[0].id).toBe('t1');
      expect(result[1].id).toBe('t2');
    });

    it('should exclude ONGOING, COMPLETED, CANCELLED tournaments', () => {
      const list: TournamentResponse[] = [
        baseTournament({ id: 't1', status: 'ONGOING', startDate: '2026-10-22T10:00:00Z' }),
        baseTournament({ id: 't2', status: 'COMPLETED', startDate: '2026-10-22T10:00:00Z' }),
        baseTournament({ id: 't3', status: 'CANCELLED', startDate: '2026-10-22T10:00:00Z' })
      ];

      const result = filterAndSortUpcomingTournaments(list, fixedNow);
      expect(result.length).toBe(0);
    });

    it('should exclude tournaments with past startDate', () => {
      const list: TournamentResponse[] = [
        baseTournament({
          id: 'past',
          status: 'UPCOMING',
          startDate: '2026-10-19T10:00:00Z'
        })
      ];

      const result = filterAndSortUpcomingTournaments(list, fixedNow);
      expect(result.length).toBe(0);
    });

    it('should sort tournaments by startDate ascending', () => {
      const list: TournamentResponse[] = [
        baseTournament({ id: 'later', startDate: '2026-10-25T10:00:00Z' }),
        baseTournament({ id: 'earlier', startDate: '2026-10-21T10:00:00Z' }),
        baseTournament({ id: 'middle', startDate: '2026-10-23T10:00:00Z' })
      ];

      const result = filterAndSortUpcomingTournaments(list, fixedNow);
      expect(result.map((r) => r.id)).toEqual(['earlier', 'middle', 'later']);
    });

    it('should limit to maximum 8 tournaments', () => {
      const list: TournamentResponse[] = Array.from({ length: 12 }, (_, i) =>
        baseTournament({
          id: `t-${i}`,
          startDate: new Date(fixedNow + (i + 1) * 86400000).toISOString()
        })
      );

      const result = filterAndSortUpcomingTournaments(list, fixedNow);
      expect(result.length).toBe(8);
    });
  });

  // ── Component Integration Tests ───────────────────────────────────────────

  describe('Component Behavior', () => {
    it('should render skeleton while loading', () => {
      const subject = new Subject<TournamentViewItem[]>();
      tournamentServiceSpy.getTournaments.and.returnValue(subject.asObservable());

      fixture = TestBed.createComponent(TournamentTickerComponent);
      component = fixture.componentInstance;
      fixture.detectChanges(); // triggers ngOnInit, pending async emission

      expect(component.isLoading()).toBeTrue();
      const skeleton = fixture.nativeElement.querySelector('.loading-ticker');
      expect(skeleton).toBeTruthy();

      subject.next([]);
      subject.complete();
    });

    it('should populate tournaments and render marquee track on successful load', () => {
      const futureDate = new Date(Date.now() + 86400000 * 3).toISOString();
      const mockTournaments = [
        baseTournament({
          id: 't-fc25',
          name: 'EA Sports FC 25 Cup',
          gameTitle: 'EA Sports FC 25',
          startDate: futureDate,
          entryFee: 1500,
          maxParticipants: 16,
          participantCount: 4,
          status: 'UPCOMING'
        })
      ];

      tournamentServiceSpy.getTournaments.and.returnValue(of(mockTournaments));

      fixture = TestBed.createComponent(TournamentTickerComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();

      expect(component.isLoading()).toBeFalse();
      expect(component.tournaments().length).toBe(1);

      const compiled = fixture.nativeElement;
      const tickerTrack = compiled.querySelector('.ticker-track');
      expect(tickerTrack).toBeTruthy();

      const links = compiled.querySelectorAll('.ticker-item');
      expect(links.length).toBe(2); // 1 primary + 1 duplicated for loop
      expect(links[0].textContent).toContain('EA Sports FC 25 Cup');
      expect(links[0].textContent).toContain('UPCOMING:');
      expect(links[0].textContent).toContain('LKR 1,500');
      expect(links[0].textContent).toContain('12 spots left');
    });

    it('should render nothing when tournament list is empty', () => {
      tournamentServiceSpy.getTournaments.and.returnValue(of([]));

      fixture = TestBed.createComponent(TournamentTickerComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();

      expect(component.isLoading()).toBeFalse();
      expect(component.tournaments().length).toBe(0);

      const compiled = fixture.nativeElement;
      expect(compiled.querySelector('.tournament-ticker')).toBeNull();
    });

    it('should handle service error gracefully and render nothing', () => {
      tournamentServiceSpy.getTournaments.and.returnValue(throwError(() => new Error('Network error')));

      fixture = TestBed.createComponent(TournamentTickerComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();

      expect(component.isLoading()).toBeFalse();
      expect(component.tournaments().length).toBe(0);

      const compiled = fixture.nativeElement;
      expect(compiled.querySelector('.tournament-ticker')).toBeNull();
    });

    it('should scale animation duration based on item count', () => {
      const mockTournaments = Array.from({ length: 4 }, (_, i) =>
        baseTournament({
          id: `t-${i}`,
          startDate: new Date(Date.now() + (i + 1) * 86400000).toISOString()
        })
      );

      tournamentServiceSpy.getTournaments.and.returnValue(of(mockTournaments));

      fixture = TestBed.createComponent(TournamentTickerComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();

      // 4 items * 6 seconds = 24s
      expect(component.animationDuration()).toBe('24s');
    });
  });
});
