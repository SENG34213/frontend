import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of, throwError } from 'rxjs';

import { AdminGamesComponent } from './admin-games.component';
import { GameAdminService } from './game-admin.service';
import { StationAdminService } from '../stations/station-admin.service';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { GameTitle, AdminGameStatsResponse } from '../../../shared/models';

describe('AdminGamesComponent', () => {
  let component: AdminGamesComponent;
  let fixture: ComponentFixture<AdminGamesComponent>;
  let mockGameService: jasmine.SpyObj<GameAdminService>;
  let mockStationService: jasmine.SpyObj<StationAdminService>;
  let mockToastService: jasmine.SpyObj<ToastService>;
  let mockRouter: jasmine.SpyObj<Router>;

  const mockGamesList: GameTitle[] = [
    {
      id: 'g-1',
      title: 'Tekken 8',
      genre: 'FIGHTING',
      platforms: ['PS5', 'PC'],
      releaseYear: 2024,
      ageRating: 'PEGI_16',
      description: 'Next gen fighting tournament.',
      maxPlayers: 2,
      featured: true,
      active: true,
      installedStationCount: 6,
      createdAt: '2026-02-10T10:00:00Z'
    },
    {
      id: 'g-2',
      title: 'Cyberpunk 2077',
      genre: 'RPG',
      platforms: ['PC'],
      releaseYear: 2023,
      ageRating: 'PEGI_18',
      description: 'Night City open world.',
      maxPlayers: 1,
      featured: false,
      active: false,
      installedStationCount: 2,
      createdAt: '2026-01-15T09:00:00Z'
    }
  ];

  const mockStats: AdminGameStatsResponse = {
    totalGames: 2,
    activeGames: 1,
    featuredGames: 1,
    topGenre: 'FIGHTING',
    multiplayerGamesCount: 1
  };

  beforeEach(async () => {
    mockGameService = jasmine.createSpyObj('GameAdminService', [
      'getGames',
      'getGameById',
      'createGame',
      'updateGame',
      'deleteGame',
      'toggleGameActive',
      'getGameStats',
      'getStationsForGame'
    ]);
    mockToastService = jasmine.createSpyObj('ToastService', ['success', 'error', 'info', 'warning']);
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);

    mockGameService.getGames.and.returnValue(of(mockGamesList));
    mockGameService.getGameStats.and.returnValue(of(mockStats));
    mockGameService.getStationsForGame.and.returnValue(of([]));
    mockGameService.createGame.and.returnValue(of({ ...mockGamesList[0], id: 'g-3', title: 'New Game' }));
    mockGameService.updateGame.and.returnValue(of({ ...mockGamesList[0], title: 'Tekken 8 Deluxe' }));
    mockGameService.deleteGame.and.returnValue(of(void 0));
    mockGameService.toggleGameActive.and.returnValue(of({ ...mockGamesList[0], active: false }));

    mockStationService = jasmine.createSpyObj('StationAdminService', ['getAllStations']);
    mockStationService.getAllStations.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [AdminGamesComponent],
      providers: [
        { provide: GameAdminService, useValue: mockGameService },
        { provide: StationAdminService, useValue: mockStationService },
        { provide: ToastService, useValue: mockToastService },
        { provide: Router, useValue: mockRouter },
        {
          provide: ActivatedRoute,
          useValue: {
            queryParams: of({})
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AdminGamesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the games management component', () => {
    expect(component).toBeTruthy();
  });

  it('should load games and statistics on initialization', () => {
    expect(mockGameService.getGames).toHaveBeenCalled();
    expect(mockGameService.getGameStats).toHaveBeenCalled();
    expect(component.games().length).toBe(2);
    expect(component.stats()).toEqual(mockStats);
  });

  it('should filter games dynamically by search term', () => {
    component.searchTerm.set('tekken');
    expect(component.filteredGames().length).toBe(1);
    expect(component.filteredGames()[0].title).toBe('Tekken 8');
  });

  it('should filter games by active status', () => {
    component.selectedStatus.set('ACTIVE');
    expect(component.filteredGames().length).toBe(1);
    expect(component.filteredGames()[0].active).toBeTrue();

    component.selectedStatus.set('INACTIVE');
    expect(component.filteredGames().length).toBe(1);
    expect(component.filteredGames()[0].active).toBeFalse();
  });

  it('should toggle platform selection in form', () => {
    component.formPlatforms.set(['PS5']);
    component.togglePlatform('PC');
    expect(component.formPlatforms()).toEqual(['PS5', 'PC']);

    // Attempting to remove the last platform should show warning
    component.formPlatforms.set(['PS5']);
    component.togglePlatform('PS5');
    expect(mockToastService.warning).toHaveBeenCalled();
  });

  it('should validate form fields before submission', () => {
    component.formTitle.set('');
    expect(component.validateForm()).toBeFalse();
    expect(component.formErrors()['title']).toBeDefined();

    component.formTitle.set('Gran Turismo 7');
    component.formReleaseYear.set(1950); // invalid
    expect(component.validateForm()).toBeFalse();
    expect(component.formErrors()['releaseYear']).toBeDefined();
  });

  it('should create a new game title when form is valid', () => {
    component.openCreateModal();
    component.formTitle.set('New Game');
    component.formGenre.set('RACING');
    component.formPlatforms.set(['PS5']);
    component.formReleaseYear.set(2025);
    component.formMaxPlayers.set(2);

    component.saveGame();

    expect(mockGameService.createGame).toHaveBeenCalledWith(jasmine.objectContaining({
      title: 'New Game',
      genre: 'RACING'
    }));
    expect(mockToastService.success).toHaveBeenCalledWith('Game Added', jasmine.any(String));
    expect(component.isCreateEditModalOpen()).toBeFalse();
  });

  it('should update an existing game title', () => {
    component.openEditModal(mockGamesList[0]);
    component.formTitle.set('Tekken 8 Deluxe');

    component.saveGame();

    expect(mockGameService.updateGame).toHaveBeenCalledWith('g-1', jasmine.objectContaining({
      title: 'Tekken 8 Deluxe'
    }));
    expect(mockToastService.success).toHaveBeenCalledWith('Game Updated', jasmine.any(String));
  });

  it('should toggle game active state', () => {
    const dummyEvent = new MouseEvent('click');
    spyOn(dummyEvent, 'stopPropagation');

    component.toggleActive(mockGamesList[0], dummyEvent);

    expect(mockGameService.toggleGameActive).toHaveBeenCalledWith('g-1');
    expect(mockToastService.info).toHaveBeenCalledWith('Status Changed', jasmine.any(String));
  });

  it('should delete a game title', () => {
    const dummyEvent = new MouseEvent('click');
    spyOn(dummyEvent, 'stopPropagation');

    component.openDeleteModal(mockGamesList[0], dummyEvent);
    expect(component.isDeleteModalOpen()).toBeTrue();

    component.confirmDelete();

    expect(mockGameService.deleteGame).toHaveBeenCalledWith('g-1');
    expect(mockToastService.success).toHaveBeenCalledWith('Game Deleted', jasmine.any(String));
    expect(component.isDeleteModalOpen()).toBeFalse();
  });

  it('should handle catalog load errors gracefully', () => {
    mockGameService.getGames.and.returnValue(throwError(() => new Error('Network error')));
    component.loadGames();

    expect(component.errorMessage()).toContain('Network error');
    expect(component.isLoading()).toBeFalse();
  });
});
