import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { DashboardComponent } from './dashboard.component';
import { BookingService } from '../../core/services/booking.service';
import { TournamentService } from '../../core/services/tournament.service';
import { Game } from '../../shared/models';

describe('DashboardComponent', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;
  let router: Router;
  let mockBookingService: jasmine.SpyObj<BookingService>;
  let mockTournamentService: jasmine.SpyObj<TournamentService>;

  const mockGames: Game[] = [
    { id: 'g-1', title: 'Spider-Man 2', featured: true, coverImage: 'spiderman.jpg' },
    { id: 'g-2', title: 'Tekken 8', featured: true, coverImage: 'tekken.jpg' },
    { id: 'g-3', title: 'Gran Turismo 7', featured: true, coverImage: 'gt7.jpg' },
    { id: 'g-4', title: 'Elden Ring', featured: true, coverImage: 'eldenring.jpg' },
    { id: 'g-5', title: 'EA FC 24', featured: true, coverImage: 'eafc24.jpg' }
  ];

  beforeEach(async () => {
    mockBookingService = jasmine.createSpyObj<BookingService>('BookingService', [
      'getGames',
      'getStations',
      'getStationGames'
    ]);
    mockBookingService.getGames.and.returnValue(of(mockGames));
    mockBookingService.getStations.and.returnValue(of([]));
    mockBookingService.getStationGames.and.returnValue(of([]));

    mockTournamentService = jasmine.createSpyObj<TournamentService>('TournamentService', [
      'getTournaments'
    ]);
    mockTournamentService.getTournaments.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        provideHttpClient(),
        provideRouter([]),
        { provide: BookingService, useValue: mockBookingService },
        { provide: TournamentService, useValue: mockTournamentService }
      ]
    }).compileComponents();

    router = TestBed.inject(Router);
    spyOn(router, 'navigate');

    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create DashboardComponent successfully', () => {
    expect(component).toBeTruthy();
  });

  describe('Featured Games Loading', () => {
    it('should load featured games and set featuredLoading to false given bookingService succeeds', () => {
      // Act
      component.ngOnInit();

      // Assert
      expect(mockBookingService.getGames).toHaveBeenCalledWith({ featured: true });
      expect(component.featuredGames().length).toBe(5);
      expect(component.featuredLoading()).toBeFalse();
    });

    it('should set featuredLoading to false given bookingService returns an error', () => {
      // Arrange
      mockBookingService.getGames.and.returnValue(throwError(() => new Error('Network error')));

      // Act
      component.ngOnInit();

      // Assert
      expect(component.featuredLoading()).toBeFalse();
    });
  });

  describe('Current Event Loading', () => {
    const mockTournaments = [
      {
        id: 'trn-1',
        name: 'FC24 Pro Cup',
        gameTitle: 'EA Sports FC 24',
        startDate: '2026-11-01T14:00:00Z',
        entryFee: 1500,
        maxParticipants: 16,
        participantCount: 12,
        registrationDeadline: '2026-10-31T23:59:59Z',
        status: 'UPCOMING' as const,
        spotsLeft: 4,
        progressPercent: 75,
        isFull: false,
        isClosingSoon: false
      },
      {
        id: 'trn-2',
        name: 'Tekken 8 Clash',
        gameTitle: 'Tekken 8',
        startDate: '2026-10-25T10:00:00Z',
        entryFee: 1000,
        maxParticipants: 32,
        participantCount: 30,
        registrationDeadline: '2026-10-24T23:59:59Z',
        status: 'IN_PROGRESS' as const,
        spotsLeft: 2,
        progressPercent: 94,
        isFull: false,
        isClosingSoon: false
      }
    ];

    it('should prioritize live/ongoing tournament as current event', () => {
      mockTournamentService.getTournaments.and.returnValue(of(mockTournaments));

      component.loadCurrentEvent();

      expect(component.currentEvent()).toEqual(mockTournaments[1]);
      expect(component.currentEvent()?.name).toBe('Tekken 8 Clash');
      expect(component.currentEventLoading()).toBeFalse();
    });

    it('should select nearest upcoming tournament when no tournament is live', () => {
      const upcomingTournaments = [
        { ...mockTournaments[0], startDate: '2026-11-10T14:00:00Z' },
        { ...mockTournaments[0], id: 'trn-earlier', name: 'Earlier Cup', startDate: '2026-10-28T14:00:00Z' }
      ];
      mockTournamentService.getTournaments.and.returnValue(of(upcomingTournaments));

      component.loadCurrentEvent();

      expect(component.currentEvent()?.id).toBe('trn-earlier');
      expect(component.currentEvent()?.name).toBe('Earlier Cup');
    });

    it('should set currentEvent to null and currentEventLoading to false on error', () => {
      mockTournamentService.getTournaments.and.returnValue(throwError(() => new Error('API error')));

      component.loadCurrentEvent();

      expect(component.currentEvent()).toBeNull();
      expect(component.currentEventLoading()).toBeFalse();
    });

    it('should navigate to tournament detail on onEventClick with tournament', () => {
      component.onEventClick(mockTournaments[0]);

      expect(router.navigate).toHaveBeenCalledWith(['/tournaments', 'trn-1']);
    });

    it('should navigate to tournaments list on onEventClick without tournament', () => {
      component.onEventClick(null);

      expect(router.navigate).toHaveBeenCalledWith(['/tournaments']);
    });
  });

  describe('Carousel Navigation', () => {
    it('should slice visibleFeaturedGames correctly according to featuredOffset and featuredVisible', () => {
      // Arrange: 5 games loaded, visible = 3, offset = 0
      expect(component.visibleFeaturedGames.length).toBe(3);
      expect(component.visibleFeaturedGames[0].id).toBe('g-1');

      // Act: next slide
      component.nextFeatured();

      // Assert
      expect(component.featuredOffset()).toBe(1);
      expect(component.visibleFeaturedGames.length).toBe(3);
      expect(component.visibleFeaturedGames[0].id).toBe('g-2');
    });

    it('should correctly evaluate canPrevFeatured and canNextFeatured boundary states', () => {
      // At start: offset 0
      expect(component.canPrevFeatured()).toBeFalse();
      expect(component.canNextFeatured()).toBeTrue();

      // Move next
      component.nextFeatured();
      expect(component.canPrevFeatured()).toBeTrue();

      // Move to end: offset = 5 - 3 = 2
      component.nextFeatured();
      expect(component.canNextFeatured()).toBeFalse();

      // Prev
      component.prevFeatured();
      expect(component.featuredOffset()).toBe(1);
    });
  });

  describe('Navigation Handlers', () => {
    it('should navigate to /bookings with gameId given onFeaturedGameClick is called', () => {
      // Arrange
      const selectedGame = mockGames[0];

      // Act
      component.onFeaturedGameClick(selectedGame);

      // Assert
      expect(router.navigate).toHaveBeenCalledWith(['/bookings'], {
        queryParams: { gameId: 'g-1' }
      });
    });

    it('should navigate to /bookings with stationId and gameId query params given onGameSelected is emitted', () => {
      // Arrange
      const event = { stationId: 'st-01', gameId: 'g-2' };

      // Act
      component.onGameSelected(event);

      // Assert
      expect(router.navigate).toHaveBeenCalledWith(['/bookings'], {
        queryParams: { stationId: 'st-01', gameId: 'g-2' }
      });
    });

    it('should navigate to /bookings given bookSlot is called', () => {
      // Act
      component.bookSlot();

      // Assert
      expect(router.navigate).toHaveBeenCalledWith(['/bookings']);
    });

    it('should navigate to /tournaments given joinTournament is called', () => {
      // Act
      component.joinTournament();

      // Assert
      expect(router.navigate).toHaveBeenCalledWith(['/tournaments']);
    });
  });
});
