import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { BookingService, BackendStationResponse, BackendSlotResponse, BackendBookingResponse, BackendGameResponse } from './booking.service';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';
import { BookingResponse } from '../../shared/models';

describe('BookingService', () => {
  let service: BookingService;
  let apiSpy: jasmine.SpyObj<ApiService>;
  let authSpy: jasmine.SpyObj<AuthService>;

  const mockBookingResp: BookingResponse = {
    id: 'bk-1',
    bookingReference: 'GC-123456',
    userId: 'usr-1',
    stationId: 'st-01',
    stationName: 'PS5-01',
    bookingDate: '2026-10-16',
    startTime: '10:00 AM',
    endTime: '11:00 AM',
    totalAmount: 1000,
    discountAmount: 200,
    finalAmount: 800,
    status: 'CONFIRMED',
    createdAt: new Date().toISOString()
  };

  beforeEach(() => {
    apiSpy = jasmine.createSpyObj('ApiService', ['get', 'post', 'put', 'patch', 'delete']);
    authSpy = jasmine.createSpyObj('AuthService', ['currentUser']);

    authSpy.currentUser.and.returnValue({
      sub: 'usr-test-123',
      userId: 'usr-test-123',
      role: 'CUSTOMER',
      iat: 0,
      exp: 9999999999
    });

    TestBed.configureTestingModule({
      providers: [
        BookingService,
        { provide: ApiService, useValue: apiSpy },
        { provide: AuthService, useValue: authSpy }
      ]
    });

    service = TestBed.inject(BookingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getStations', () => {
    it('should fetch from API and map backend response correctly', (done) => {
      const orig = environment.useMocks;
      environment.useMocks = false;

      const backendResponse: BackendStationResponse[] = [
        {
          id: 'b-st-1',
          stationCode: 'CONSOLE-01',
          type: 'CONSOLE',
          hourlyRate: 600,
          active: true
        },
        {
          id: 'b-st-2',
          stationCode: 'VR-01',
          type: 'VR',
          hourlyRate: 800,
          active: true,
          name: 'Custom VR Name',
          imageUrl: 'custom-vr.jpg'
        },
        {
          id: 'b-st-3',
          stationCode: 'PC-01',
          type: 'PC',
          hourlyRate: 700,
          active: false
        },
        {
          id: 'b-st-4',
          stationCode: 'UNKNOWN-01',
          type: 'OTHER',
          hourlyRate: 0,
          active: true
        }
      ];

      apiSpy.get.and.returnValue(of(backendResponse));

      service.getStations().subscribe((stations) => {
        expect(stations.length).toBe(4);

        // First station (CONSOLE default naming & even image)
        expect(stations[0].id).toBe('b-st-1');
        expect(stations[0].name).toBe('PS5 CONSOLE-01');
        expect(stations[0].type).toBe('PS5');
        expect(stations[0].imageUrl).toBe('/assets/images/ps5_console_01.jpg');
        expect(stations[0].controllersCount).toBe(2);
        expect(stations[0].specifications).toContain('DualSense Wireless');
        expect(stations[0].active).toBeTrue();
        expect(stations[0].hourlyRate).toBe(600);

        // Second station (VR with custom name and image)
        expect(stations[1].name).toBe('Custom VR Name');
        expect(stations[1].imageUrl).toBe('custom-vr.jpg');
        expect(stations[1].specifications).toContain('Meta Quest Pro');

        // Third station (PC)
        expect(stations[2].name).toBe('GAMING PC-01');
        expect(stations[2].type).toBe('PC_ESPORTS');
        expect(stations[2].specifications).toContain('RTX 4080');
        expect(stations[2].active).toBeFalse();

        // Fourth station (other fallback)
        expect(stations[3].name).toBe('UNKNOWN-01');
        expect(stations[3].hourlyRate).toBe(400);

        environment.useMocks = orig;
        done();
      });
    });

    it('should handle odd console index image and fallback station names without codes', (done) => {
      const orig = environment.useMocks;
      environment.useMocks = false;

      const backendResponse: BackendStationResponse[] = [
        { id: '1', stationCode: '', type: 'OTHER', hourlyRate: 500, active: true },
        { id: '2', stationCode: '', type: 'CONSOLE', hourlyRate: 500, active: true },
        { id: '3', stationCode: '', type: 'PC', hourlyRate: 500, active: true },
        { id: '4', stationCode: '', type: 'VR', hourlyRate: 500, active: true }
      ];

      apiSpy.get.and.returnValue(of(backendResponse));

      service.getStations().subscribe((stations) => {
        expect(stations[0].name).toBe('STATION 1');
        expect(stations[1].name).toBe('PS5 CONSOLE 2');
        expect(stations[1].imageUrl).toBe('/assets/images/ps5_console_02.jpg');
        expect(stations[2].name).toBe('GAMING PC 3');
        expect(stations[3].name).toBe('VR STATION 4');
        expect(stations[3].imageUrl).toBe('/assets/images/ps5_console_02.jpg');
        environment.useMocks = orig;
        done();
      });
    });

    it('should return empty array when backend returns empty array or null', (done) => {
      const orig = environment.useMocks;
      environment.useMocks = false;

      apiSpy.get.and.returnValue(of([]));

      service.getStations().subscribe((stations) => {
        expect(stations).toEqual([]);
        environment.useMocks = orig;
        done();
      });
    });

    it('should propagate error when api fails', (done) => {
      const orig = environment.useMocks;
      environment.useMocks = false;

      apiSpy.get.and.returnValue(throwError(() => new Error('Network error')));

      service.getStations().subscribe({
        next: () => fail('Should have failed'),
        error: (err) => {
          expect(err.message).toBe('Network error');
          environment.useMocks = orig;
          done();
        }
      });
    });
  });

  describe('getStationAvailability', () => {
    const validUuid = '12345678-1234-1234-1234-123456789abc';

    it('should call API when stationId is a valid UUID', (done) => {
      const orig = environment.useMocks;
      environment.useMocks = false;

      const backendSlots: BackendSlotResponse[] = [
        { startTime: '10:00', endTime: '11:00', available: true },
        { startTime: '11:00', endTime: '12:00', isAvailable: false },
        { startTime: '12:00', endTime: '13:00' } // defaults to true
      ];

      apiSpy.get.and.returnValue(of(backendSlots));

      service.getStationAvailability(validUuid, '2026-10-16').subscribe((slots) => {
        expect(apiSpy.get).toHaveBeenCalledWith(`/stations/${validUuid}/availability`, {
          params: { date: '2026-10-16' }
        });
        expect(slots.length).toBe(3);
        expect(slots[0].isAvailable).toBeTrue();
        expect(slots[1].isAvailable).toBeFalse();
        expect(slots[2].isAvailable).toBeTrue();
        environment.useMocks = orig;
        done();
      });
    });

    it('should return empty array if backend returns empty slots', (done) => {
      const orig = environment.useMocks;
      environment.useMocks = false;

      apiSpy.get.and.returnValue(of([]));

      service.getStationAvailability(validUuid, '2026-10-16').subscribe((slots) => {
        expect(slots).toEqual([]);
        environment.useMocks = orig;
        done();
      });
    });

    it('should propagate error on API error', (done) => {
      const orig = environment.useMocks;
      environment.useMocks = false;

      apiSpy.get.and.returnValue(throwError(() => new Error('Error')));

      service.getStationAvailability(validUuid, '2026-10-16').subscribe({
        next: () => fail('Should have failed'),
        error: (err) => {
          expect(err.message).toBe('Error');
          environment.useMocks = orig;
          done();
        }
      });
    });
  });

  describe('getStationGames', () => {
    it('should return games mapping coverUrl to coverImage and filtering inactive games given API returns games', (done) => {
      const orig = environment.useMocks;
      environment.useMocks = false;

      const backendGames: BackendGameResponse[] = [
        {
          id: 'g-1',
          title: 'Spider-Man 2',
          genre: 'Action',
          coverUrl: 'https://example.com/spiderman.jpg',
          platforms: ['PS5'],
          active: true,
          featured: true
        },
        {
          id: 'g-2',
          title: 'Inactive Game',
          active: false
        },
        {
          id: 'g-3',
          title: 'Game Without Cover',
          active: true
        }
      ];

      apiSpy.get.and.returnValue(of(backendGames));

      service.getStationGames('st-01').subscribe((games) => {
        expect(apiSpy.get).toHaveBeenCalledWith('/stations/st-01/games');
        expect(games.length).toBe(2);
        expect(games[0].id).toBe('g-1');
        expect(games[0].coverImage).toBe('https://example.com/spiderman.jpg');
        expect(games[1].id).toBe('g-3');
        expect(games[1].coverImage).toBe('/assets/images/ps5_console_01.jpg');
        environment.useMocks = orig;
        done();
      });
    });

    it('should propagate error given API fails', (done) => {
      const orig = environment.useMocks;
      environment.useMocks = false;

      apiSpy.get.and.returnValue(throwError(() => new Error('API Failure')));

      service.getStationGames('st-01').subscribe({
        next: () => fail('Should have failed'),
        error: (err) => {
          expect(err.message).toBe('API Failure');
          environment.useMocks = orig;
          done();
        }
      });
    });
  });

  describe('getGames', () => {

    it('should fetch featured games with params given { featured: true } and useMocks is false', (done) => {
      const orig = environment.useMocks;
      environment.useMocks = false;

      const backendGames: BackendGameResponse[] = [
        { id: 'g-feat', title: 'Featured Game', active: true, featured: true, coverUrl: 'feat.jpg' }
      ];

      apiSpy.get.and.returnValue(of(backendGames));

      service.getGames({ featured: true }).subscribe((games) => {
        expect(apiSpy.get).toHaveBeenCalledWith('/games', { params: { active: 'true', featured: 'true' } });
        expect(games.length).toBe(1);
        expect(games[0].title).toBe('Featured Game');
        expect(games[0].coverImage).toBe('feat.jpg');
        environment.useMocks = orig;
        done();
      });
    });

    it('should propagate error given API error', (done) => {
      const orig = environment.useMocks;
      environment.useMocks = false;

      apiSpy.get.and.returnValue(throwError(() => new Error('Failed to load games')));

      service.getGames().subscribe({
        next: () => fail('Should have failed'),
        error: (err) => {
          expect(err.message).toBe('Failed to load games');
          environment.useMocks = orig;
          done();
        }
      });
    });
  });

  describe('getGameStations', () => {
    it('should fetch stations for game from API and map them given gameId and useMocks is false', (done) => {
      const orig = environment.useMocks;
      environment.useMocks = false;

      const backendStations: BackendStationResponse[] = [
        { id: 'st-uuid-1', stationCode: 'PS5-01', type: 'CONSOLE', hourlyRate: 600, active: true }
      ];

      apiSpy.get.and.returnValue(of(backendStations));

      service.getGameStations('game-01').subscribe((stations) => {
        expect(apiSpy.get).toHaveBeenCalledWith('/games/game-01/stations');
        expect(stations.length).toBe(1);
        expect(stations[0].id).toBe('st-uuid-1');
        expect(stations[0].name).toBe('PS5 PS5-01');
        environment.useMocks = orig;
        done();
      });
    });

    it('should propagate error given API error', (done) => {
      const orig = environment.useMocks;
      environment.useMocks = false;

      apiSpy.get.and.returnValue(throwError(() => new Error('Failed to load game stations')));

      service.getGameStations('game-01').subscribe({
        next: () => fail('Should have failed'),
        error: (err) => {
          expect(err.message).toBe('Failed to load game stations');
          environment.useMocks = orig;
          done();
        }
      });
    });
  });

  describe('createBooking', () => {
    const validUuid = '12345678-1234-1234-1234-123456789abc';

    it('should handle future booking request with API and assert outgoing HTTP payload contains gameId', (done) => {
      const orig = environment.useMocks;
      environment.useMocks = false;

      const futureDate = new Date(Date.now() + 86400000 * 5).toISOString().split('T')[0];
      const backendBooking: BackendBookingResponse = {
        id: '12345678-abcd-ef01-2345-6789abcdef01',
        userId: 'usr-1',
        stationId: validUuid,
        stationCode: 'PS5-01',
        gameId: 'game-01',
        startTime: `${futureDate}T10:00:00.000Z`,
        endTime: `${futureDate}T11:00:00.000Z`,
        status: 'CONFIRMED',
        totalAmount: 1000,
        discountAmount: 200,
        payableAmount: 800,
        createdAt: '2026-10-16T12:00:00.000Z'
      };

      apiSpy.post.and.returnValue(of(backendBooking));

      service.createBooking({
        stationId: validUuid,
        gameId: 'game-01',
        bookingDate: futureDate,
        startTime: '10:00',
        endTime: '11:00',
        paymentMethod: 'CARD',
        pointsToRedeem: 100
      }).subscribe((res) => {
        expect(apiSpy.post).toHaveBeenCalled();
        const postCall = apiSpy.post.calls.mostRecent();
        const payload = postCall.args[1] as { gameId: string; stationId: string };
        expect(postCall.args[0]).toBe('/bookings');
        expect(payload.gameId).toBe('game-01');
        expect(payload.stationId).toBe(validUuid);
        expect(res.id).toBe(backendBooking.id);
        expect(res.gameId).toBe('game-01');
        expect(res.bookingReference).toContain('GC-12345678');
        expect(res.stationName).toBe('PS5 PS5-01');
        expect(res.totalAmount).toBe(1000);
        expect(res.discountAmount).toBe(200);
        expect(res.finalAmount).toBe(800);
        expect(res.status).toBe('CONFIRMED');
        environment.useMocks = orig;
        done();
      });
    });

    it('should handle startTime/endTime already formatted as ISO string, send gameId, and roll past date forward', (done) => {
      const orig = environment.useMocks;
      environment.useMocks = false;

      // Past date with 'T'
      const pastStartIso = '2020-01-01T10:00:00.000Z';
      const pastEndIso = '2020-01-01T11:00:00.000Z';

      const backendBooking: BackendBookingResponse = {
        id: '',
        userId: 'usr-1',
        stationId: validUuid,
        gameId: 'game-02',
        startTime: '',
        endTime: '',
        status: ''
      };

      apiSpy.post.and.returnValue(of(backendBooking));

      service.createBooking({
        stationId: validUuid,
        gameId: 'game-02',
        bookingDate: '2020-01-01',
        startTime: pastStartIso,
        endTime: pastEndIso,
        paymentMethod: 'CARD'
      }).subscribe((res) => {
        expect(apiSpy.post).toHaveBeenCalled();
        const callArgs = apiSpy.post.calls.mostRecent().args[1] as { startTime: string; endTime: string; gameId: string };
        expect(callArgs.gameId).toBe('game-02');
        // Should have rolled forward to tomorrow or after
        expect(new Date(callArgs.startTime).getTime()).toBeGreaterThan(Date.now());
        expect(res.stationName).toBe(validUuid);
        expect(res.status).toBe('CONFIRMED');
        environment.useMocks = orig;
        done();
      });
    });
  });

  describe('getMyBookings', () => {

    it('should call API when useMocks is false', (done) => {
      const orig = environment.useMocks;
      environment.useMocks = false;

      apiSpy.get.and.returnValue(of([mockBookingResp]));

      service.getMyBookings().subscribe((bookings) => {
        expect(apiSpy.get).toHaveBeenCalledWith('/bookings/mine');
        expect(bookings).toEqual([mockBookingResp]);
        environment.useMocks = orig;
        done();
      });
    });

    it('should return empty array if API throws error', (done) => {
      const orig = environment.useMocks;
      environment.useMocks = false;

      apiSpy.get.and.returnValue(throwError(() => new Error('Error')));

      service.getMyBookings().subscribe((bookings) => {
        expect(bookings).toEqual([]);
        environment.useMocks = orig;
        done();
      });
    });
  });
});
