import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { DashboardComponent } from './dashboard.component';
import { BookingService } from '../../core/services/booking.service';
import { Game } from '../../shared/models';

describe('DashboardComponent', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;
  let router: Router;
  let mockBookingService: jasmine.SpyObj<BookingService>;

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

    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        provideHttpClient(),
        provideRouter([]),
        { provide: BookingService, useValue: mockBookingService }
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

    it('should navigate to /bookings given joinTournament is called', () => {
      // Act
      component.joinTournament();

      // Assert
      expect(router.navigate).toHaveBeenCalledWith(['/bookings']);
    });
  });
});
