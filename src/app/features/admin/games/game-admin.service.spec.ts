import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { GameAdminService } from './game-admin.service';
import { ApiService } from '../../../core/services/api.service';
import { GameTitle, CreateGameRequest, UpdateGameRequest, AdminGameStatsResponse, Station } from '../../../shared/models';

describe('GameAdminService', () => {
  let service: GameAdminService;
  let apiSpy: jasmine.SpyObj<ApiService>;

  const mockGame: GameTitle = {
    id: 'g-1',
    title: 'EA Sports FC 25',
    genre: 'SPORTS',
    coverUrl: 'fc25.jpg',
    platforms: ['PS5'],
    releaseYear: 2024,
    ageRating: 'PEGI_3',
    description: 'Football simulation',
    maxPlayers: 4,
    installedStationCount: 2,
    createdAt: '2026-10-19T00:00:00Z',
    active: true,
    featured: true
  };

  beforeEach(() => {
    apiSpy = jasmine.createSpyObj('ApiService', ['get', 'post', 'put', 'patch', 'delete']);
    TestBed.configureTestingModule({
      providers: [
        GameAdminService,
        { provide: ApiService, useValue: apiSpy }
      ]
    });
    service = TestBed.inject(GameAdminService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should get games with query params', (done) => {
    apiSpy.get.and.returnValue(of([mockGame]));

    service.getGames({ search: 'FC', genre: 'SPORTS', platform: 'PS5', active: true, featured: true }).subscribe(games => {
      expect(games.length).toBe(1);
      expect(apiSpy.get).toHaveBeenCalledWith('/admin/games', jasmine.any(Object));
      done();
    });
  });

  it('should get game by ID', (done) => {
    apiSpy.get.and.returnValue(of(mockGame));

    service.getGameById('g-1').subscribe(res => {
      expect(res.id).toBe('g-1');
      expect(apiSpy.get).toHaveBeenCalledWith('/admin/games/g-1');
      done();
    });
  });

  it('should create game via POST', (done) => {
    const req: CreateGameRequest = {
      title: 'Tekken 8',
      genre: 'FIGHTING',
      platforms: ['PS5'],
      releaseYear: 2024,
      ageRating: 'PEGI_16',
      description: 'Fighting game',
      maxPlayers: 2,
      active: true,
      featured: false
    };

    apiSpy.post.and.returnValue(of(mockGame));

    service.createGame(req).subscribe(res => {
      expect(res.id).toBe('g-1');
      expect(apiSpy.post).toHaveBeenCalledWith('/admin/games', req);
      done();
    });
  });

  it('should update game via PUT', (done) => {
    const req: UpdateGameRequest = {
      title: 'Tekken 8 Ultimate'
    };

    apiSpy.put.and.returnValue(of(mockGame));

    service.updateGame('g-1', req).subscribe(res => {
      expect(res.id).toBe('g-1');
      expect(apiSpy.put).toHaveBeenCalledWith('/admin/games/g-1', req);
      done();
    });
  });

  it('should delete game via DELETE', (done) => {
    apiSpy.delete.and.returnValue(of(undefined));

    service.deleteGame('g-1').subscribe(() => {
      expect(apiSpy.delete).toHaveBeenCalledWith('/admin/games/g-1');
      done();
    });
  });

  it('should toggle game active via PATCH', (done) => {
    apiSpy.patch.and.returnValue(of({ ...mockGame, active: false }));

    service.toggleGameActive('g-1').subscribe(res => {
      expect(res.active).toBeFalse();
      expect(apiSpy.patch).toHaveBeenCalledWith('/admin/games/g-1/toggle-active', {});
      done();
    });
  });

  it('should get game stats via GET', (done) => {
    const stats: AdminGameStatsResponse = {
      totalGames: 20,
      activeGames: 18,
      featuredGames: 5,
      topGenre: 'SPORTS',
      multiplayerGamesCount: 12
    };

    apiSpy.get.and.returnValue(of(stats));

    service.getGameStats().subscribe(res => {
      expect(res.totalGames).toBe(20);
      expect(apiSpy.get).toHaveBeenCalledWith('/admin/games/stats');
      done();
    });
  });

  it('should get games for station', (done) => {
    apiSpy.get.and.returnValue(of([mockGame]));

    service.getGamesForStation('st-1').subscribe(games => {
      expect(games.length).toBe(1);
      expect(apiSpy.get).toHaveBeenCalledWith('/stations/st-1/games');
      done();
    });
  });

  it('should assign games to station', (done) => {
    apiSpy.post.and.returnValue(of([mockGame]));

    service.assignGamesToStation('st-1', ['g-1']).subscribe(games => {
      expect(games.length).toBe(1);
      expect(apiSpy.post).toHaveBeenCalledWith('/stations/st-1/games', { gameIds: ['g-1'] });
      done();
    });
  });

  it('should remove game from station', (done) => {
    apiSpy.delete.and.returnValue(of(undefined));

    service.removeGameFromStation('st-1', 'g-1').subscribe(() => {
      expect(apiSpy.delete).toHaveBeenCalledWith('/stations/st-1/games/g-1');
      done();
    });
  });

  it('should get stations for game', (done) => {
    const mockStations: Station[] = [
      {
        id: 'st-1',
        stationNumber: 1,
        stationCode: 'CONSOLE-01',
        name: 'PS5 01',
        type: 'PS5',
        hourlyRate: 500,
        specifications: '',
        imageUrl: '',
        controllersCount: 2,
        active: true
      }
    ];

    apiSpy.get.and.returnValue(of(mockStations));

    service.getStationsForGame('g-1').subscribe(stations => {
      expect(stations.length).toBe(1);
      expect(apiSpy.get).toHaveBeenCalledWith('/admin/games/g-1/stations');
      done();
    });
  });

  it('should update stations for game', (done) => {
    const mockStations: Station[] = [];
    apiSpy.put.and.returnValue(of(mockStations));

    service.updateStationsForGame('g-1', ['st-1', 'st-2']).subscribe(stations => {
      expect(stations).toEqual([]);
      expect(apiSpy.put).toHaveBeenCalledWith('/admin/games/g-1/stations', ['st-1', 'st-2']);
      done();
    });
  });
});
