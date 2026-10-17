import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SimpleChange } from '@angular/core';
import { of, throwError } from 'rxjs';
import { By } from '@angular/platform-browser';
import { StationGamePickerComponent } from './station-game-picker.component';
import { BookingService } from '../../../core/services/booking.service';
import { Station, Game } from '../../models';
import { SkeletonComponent } from '../../ui/skeleton/skeleton.component';
import { EmptyStateComponent } from '../../ui/empty-state/empty-state.component';

describe('StationGamePickerComponent', () => {
  let component: StationGamePickerComponent;
  let fixture: ComponentFixture<StationGamePickerComponent>;
  let mockBookingService: jasmine.SpyObj<BookingService>;

  const mockStations: Station[] = [
    {
      id: 'st-01',
      stationNumber: 1,
      stationCode: 'PS5-01',
      name: 'PlayStation 5 #01',
      type: 'PS5',
      hourlyRate: 650,
      specifications: '4K OLED Display',
      controllersCount: 2,
      active: true
    },
    {
      id: 'st-02',
      stationNumber: 2,
      stationCode: 'PS5-02',
      name: 'PlayStation 5 #02',
      type: 'PS5',
      hourlyRate: 650,
      specifications: '4K OLED Display',
      controllersCount: 2,
      active: true
    },
    {
      id: 'st-03',
      stationNumber: 3,
      stationCode: 'PS5-03',
      name: 'PlayStation 5 Inactive',
      type: 'PS5',
      hourlyRate: 600,
      active: false
    }
  ];

  const station1Games: Game[] = [
    { id: 'game-01', title: 'Gran Turismo 7', coverImage: 'gt7.jpg', active: true },
    { id: 'game-02', title: 'Spider-Man 2', coverImage: 'sm2.jpg', active: true }
  ];

  const station2Games: Game[] = [
    { id: 'game-03', title: 'Tekken 8', coverImage: 'tekken.jpg', active: true }
  ];

  beforeEach(async () => {
    mockBookingService = jasmine.createSpyObj<BookingService>('BookingService', [
      'getStations',
      'getStationGames'
    ]);

    mockBookingService.getStations.and.returnValue(of(mockStations));
    mockBookingService.getStationGames.and.callFake((stationId: string) => {
      if (stationId === 'st-01') return of(station1Games);
      if (stationId === 'st-02') return of(station2Games);
      return of([]);
    });

    await TestBed.configureTestingModule({
      imports: [StationGamePickerComponent],
      providers: [
        { provide: BookingService, useValue: mockBookingService }
      ]
    }).compileComponents();
  });

  function createComponent(): void {
    fixture = TestBed.createComponent(StationGamePickerComponent);
    component = fixture.componentInstance;
  }

  it('should create StationGamePickerComponent', () => {
    createComponent();
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  describe('Station Loading', () => {
    it('should load active stations on init and select first active station given no initialStationId', () => {
      // Arrange
      createComponent();

      // Act
      fixture.detectChanges();

      // Assert
      expect(mockBookingService.getStations).toHaveBeenCalled();
      expect(component.stations()).toEqual(mockStations);
      expect(component.activeStations().length).toBe(2);
      expect(component.selectedStationId()).toBe('st-01');
      expect(component.stationsLoading()).toBeFalse();
    });

    it('should set stationsLoading to false given getStations throws an error', () => {
      // Arrange
      mockBookingService.getStations.and.returnValue(throwError(() => new Error('Network error')));
      createComponent();

      // Act
      fixture.detectChanges();

      // Assert
      expect(component.stationsLoading()).toBeFalse();
      expect(component.stations().length).toBe(0);
    });
  });

  describe('Station & Game Selection and Emission', () => {
    it('should load only the selected station games and emit stationSelected given a station is selected', () => {
      // Arrange
      createComponent();
      fixture.detectChanges();
      spyOn(component.stationSelected, 'emit');

      // Act: select station 2
      component.selectStation('st-02');

      // Assert
      expect(component.selectedStationId()).toBe('st-02');
      expect(component.stationSelected.emit).toHaveBeenCalledWith('st-02');
      expect(mockBookingService.getStationGames).toHaveBeenCalledWith('st-02');
      expect(component.stationGames()).toEqual(station2Games);
      expect(component.selectedGameId()).toBeNull();
    });

    it('should emit gameSelected with stationId and gameId given a game is selected', () => {
      // Arrange
      createComponent();
      fixture.detectChanges();
      spyOn(component.gameSelected, 'emit');

      // Act
      component.selectGame('game-01');

      // Assert
      expect(component.selectedGameId()).toBe('game-01');
      expect(component.gameSelected.emit).toHaveBeenCalledWith({
        stationId: 'st-01',
        gameId: 'game-01'
      });
    });

    it('should ignore selectStation call given the same station is already selected', () => {
      // Arrange
      createComponent();
      fixture.detectChanges();
      spyOn(component.stationSelected, 'emit');
      const callCount = mockBookingService.getStationGames.calls.count();

      // Act: reselect st-01
      component.selectStation('st-01');

      // Assert
      expect(component.stationSelected.emit).not.toHaveBeenCalled();
      expect(mockBookingService.getStationGames.calls.count()).toBe(callCount);
    });
  });

  describe('UI States: Skeletons & Empty State', () => {
    it('should show skeletons while loading games given gamesLoading is true', () => {
      // Arrange
      createComponent();
      fixture.detectChanges();

      // Act: set gamesLoading to true
      component.gamesLoading.set(true);
      fixture.detectChanges();

      // Assert: skeleton components should be rendered inside games section
      const skeletons = fixture.debugElement.queryAll(By.directive(SkeletonComponent));
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('should show empty-state when a station has no games given empty stationGames', () => {
      // Arrange
      createComponent();
      fixture.detectChanges();

      // Act: select an empty station
      component.selectStation('st-empty');
      fixture.detectChanges();

      // Assert
      const emptyState = fixture.debugElement.query(By.directive(EmptyStateComponent));
      expect(emptyState).toBeTruthy();
      expect(component.stationGames().length).toBe(0);
    });
  });

  describe('Initial ID Inputs', () => {
    it('should respect initialStationId and initialGameId given they are provided as inputs', () => {
      // Arrange
      createComponent();
      component.initialStationId = 'st-02';
      component.initialGameId = 'game-03';

      // Act
      fixture.detectChanges();

      // Assert
      expect(component.selectedStationId()).toBe('st-02');
      expect(mockBookingService.getStationGames).toHaveBeenCalledWith('st-02');
      expect(component.selectedGameId()).toBe('game-03');
    });

    it('should update selection on ngOnChanges given initialStationId changes dynamically', () => {
      // Arrange
      createComponent();
      fixture.detectChanges();

      // Act: change initialStationId dynamically
      component.initialStationId = 'st-02';
      component.ngOnChanges({
        initialStationId: new SimpleChange('st-01', 'st-02', false)
      });
      fixture.detectChanges();

      // Assert
      expect(component.selectedStationId()).toBe('st-02');
      expect(mockBookingService.getStationGames).toHaveBeenCalledWith('st-02');
    });

    it('should update selectedGameId on ngOnChanges given initialGameId changes dynamically', () => {
      // Arrange
      createComponent();
      fixture.detectChanges();

      // Act: change initialGameId dynamically
      component.initialGameId = 'game-02';
      component.ngOnChanges({
        initialGameId: new SimpleChange(null, 'game-02', false)
      });

      // Assert
      expect(component.selectedGameId()).toBe('game-02');
    });
  });

  describe('Helper formatting methods', () => {
    it('should return correct station type labels and badge variants', () => {
      createComponent();
      expect(component.getStationTypeLabel('PC')).toBe('PC');
      expect(component.getStationTypeLabel('PC_ESPORTS')).toBe('PC');
      expect(component.getStationTypeLabel('VR')).toBe('VR');
      expect(component.getStationTypeLabel('XBOX_SERIES_X')).toBe('XBOX');
      expect(component.getStationTypeLabel('CONSOLE')).toBe('CONSOLE');

      expect(component.getStationBadgeVariant('PC')).toBe('primary');
      expect(component.getStationBadgeVariant('VR')).toBe('accent');
      expect(component.getStationBadgeVariant('PS5')).toBe('info');

      expect(component.getPlatformIcon('PS5')).toBe('🎮');
      expect(component.getPlatformIcon('PC')).toBe('🖥️');
      expect(component.getPlatformIcon('VR')).toBe('🥽');
    });
  });
});
