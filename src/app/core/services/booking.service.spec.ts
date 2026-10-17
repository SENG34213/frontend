import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { BookingService, BackendStationResponse, BackendSlotResponse, BackendBookingResponse } from './booking.service';
import { ApiService } from './api.service';
import { MockDataService } from './mock/mock-data.service';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';
import { Station, SlotAvailability, Game, BookingResponse, LoyaltyBalanceDto } from '../../shared/models';

describe('BookingService', () => {
  let service: BookingService;
  let apiSpy: jasmine.SpyObj<ApiService>;
  let mockDataSpy: jasmine.SpyObj<MockDataService>;
  let authSpy: jasmine.SpyObj<AuthService>;

  const mockStationsData: Station[] = [
    {
      id: 'mock-st-1',
      stationNumber: 1,
      stationCode: 'PS5-01',
      name: 'Mock Station',
      type: 'PS5',
      hourlyRate: 500,
      specifications: 'Specs',
      controllersCount: 2,
      imageUrl: '/assets/images/ps5_console_01.jpg',
      active: true
    }
  ];

  const mockSlotsData: SlotAvailability[] = [
    {
      stationId: 'st-01',
      date: '2026-10-16',
      startTime: '10:00',
      endTime: '11:00',
      isAvailable: true,
      price: 500
    }
  ];

  const mockGamesData: Game[] = [
    { id: 'g-1', title: 'Game 1', coverImage: 'img.jpg' }
  ];

  const mockLoyalty: LoyaltyBalanceDto = {
    userId: 'usr-1',
    pointsBalance: 500,
    tier: 'SILVER',
    equivalentDiscountLkr: 500
  };

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
    mockDataSpy = jasmine.createSpyObj('MockDataService', [
      'getStations',
      'getStationAvailability',
      'getGames',
      'getLoyaltyBalance',
      'createBooking'
    ]);
    authSpy = jasmine.createSpyObj('AuthService', ['currentUser']);

    mockDataSpy.getStations.and.returnValue(of(mockStationsData));
    mockDataSpy.getStationAvailability.and.returnValue(of(mockSlotsData));
    mockDataSpy.getGames.and.returnValue(of(mockGamesData));
    mockDataSpy.getLoyaltyBalance.and.returnValue(of(mockLoyalty));
    mockDataSpy.createBooking.and.returnValue(of(mockBookingResp));

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
        { provide: MockDataService, useValue: mockDataSpy },
        { provide: AuthService, useValue: authSpy }
      ]
    });

    service = TestBed.inject(BookingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getStations', () => {
    it('should return mock data when environment.useMocks is true', (done) => {
      const orig = environment.useMocks;
      environment.useMocks = true;

      service.getStations().subscribe((stations) => {
        expect(stations).toEqual(mockStationsData);
        expect(mockDataSpy.getStations).toHaveBeenCalled();
        expect(apiSpy.get).not.toHaveBeenCalled();
        environment.useMocks = orig;
        done();
      });
    });

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

    it('should fallback to mock data when api fails', (done) => {
      const orig = environment.useMocks;
      environment.useMocks = false;

      apiSpy.get.and.returnValue(throwError(() => new Error('Network error')));

      service.getStations().subscribe((stations) => {
        expect(stations).toEqual(mockStationsData);
        expect(mockDataSpy.getStations).toHaveBeenCalled();
        environment.useMocks = orig;
        done();
      });
    });
  });

  describe('getStationAvailability', () => {
    const validUuid = '12345678-1234-1234-1234-123456789abc';

    it('should use mock data if stationId is not a UUID', (done) => {
      const orig = environment.useMocks;
      environment.useMocks = false;

      service.getStationAvailability('non-uuid-1', '2026-10-16').subscribe((slots) => {
        expect(slots).toEqual(mockSlotsData);
        expect(mockDataSpy.getStationAvailability).toHaveBeenCalledWith('non-uuid-1', '2026-10-16');
        expect(apiSpy.get).not.toHaveBeenCalled();
        environment.useMocks = orig;
        done();
      });
    });

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

    it('should fallback to mock data on API error', (done) => {
      const orig = environment.useMocks;
      environment.useMocks = false;

      apiSpy.get.and.returnValue(throwError(() => new Error('Error')));

      service.getStationAvailability(validUuid, '2026-10-16').subscribe((slots) => {
        expect(mockDataSpy.getStationAvailability).toHaveBeenCalledWith(validUuid, '2026-10-16');
        expect(slots).toEqual(mockSlotsData);
        environment.useMocks = orig;
        done();
      });
    });
  });

  describe('getGames', () => {
    it('should delegate to mockData.getGames', (done) => {
      service.getGames().subscribe((games) => {
        expect(games).toEqual(mockGamesData);
        expect(mockDataSpy.getGames).toHaveBeenCalled();
        done();
      });
    });
  });

  describe('getLoyaltyBalance', () => {
    it('should return mock data when useMocks is true', (done) => {
      const orig = environment.useMocks;
      environment.useMocks = true;

      service.getLoyaltyBalance().subscribe((balance) => {
        expect(balance).toEqual(mockLoyalty);
        expect(mockDataSpy.getLoyaltyBalance).toHaveBeenCalledWith('usr-test-123');
        environment.useMocks = orig;
        done();
      });
    });

    it('should fetch from API when useMocks is false and fallback user when not authenticated', (done) => {
      const orig = environment.useMocks;
      environment.useMocks = false;
      authSpy.currentUser.and.returnValue(null);

      apiSpy.get.and.returnValue(of(mockLoyalty));

      service.getLoyaltyBalance().subscribe((balance) => {
        expect(apiSpy.get).toHaveBeenCalledWith('/loyalty/balance/usr-customer-1');
        expect(balance).toEqual(mockLoyalty);
        environment.useMocks = orig;
        done();
      });
    });

    it('should fallback to mock data when api call fails', (done) => {
      const orig = environment.useMocks;
      environment.useMocks = false;

      apiSpy.get.and.returnValue(throwError(() => new Error('API Error')));

      service.getLoyaltyBalance().subscribe((balance) => {
        expect(mockDataSpy.getLoyaltyBalance).toHaveBeenCalled();
        expect(balance).toEqual(mockLoyalty);
        environment.useMocks = orig;
        done();
      });
    });
  });

  describe('createBooking', () => {
    const validUuid = '12345678-1234-1234-1234-123456789abc';

    it('should delegate to mockData when useMocks is true or stationId is non-uuid', (done) => {
      const orig = environment.useMocks;
      environment.useMocks = false;

      service.createBooking({
        stationId: 'st-01',
        bookingDate: '2026-10-16',
        startTime: '10:00',
        endTime: '11:00',
        paymentMethod: 'CARD'
      }).subscribe((res) => {
        expect(mockDataSpy.createBooking).toHaveBeenCalledWith({
          stationId: 'st-01',
          bookingDate: '2026-10-16',
          startTime: '10:00',
          endTime: '11:00'
        });
        expect(res).toEqual(mockBookingResp);
        environment.useMocks = orig;
        done();
      });
    });

    it('should handle future booking request with API', (done) => {
      const orig = environment.useMocks;
      environment.useMocks = false;

      const futureDate = new Date(Date.now() + 86400000 * 5).toISOString().split('T')[0];
      const backendBooking: BackendBookingResponse = {
        id: '12345678-abcd-ef01-2345-6789abcdef01',
        userId: 'usr-1',
        stationId: validUuid,
        stationCode: 'PS5-01',
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
        bookingDate: futureDate,
        startTime: '10:00',
        endTime: '11:00',
        paymentMethod: 'CARD',
        pointsToRedeem: 100
      }).subscribe((res) => {
        expect(apiSpy.post).toHaveBeenCalled();
        expect(res.id).toBe(backendBooking.id);
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

    it('should handle startTime/endTime already formatted as ISO string and roll past date forward', (done) => {
      const orig = environment.useMocks;
      environment.useMocks = false;

      // Past date with 'T'
      const pastStartIso = '2020-01-01T10:00:00.000Z';
      const pastEndIso = '2020-01-01T11:00:00.000Z';

      const backendBooking: BackendBookingResponse = {
        id: '',
        userId: 'usr-1',
        stationId: validUuid,
        startTime: '',
        endTime: '',
        status: ''
      };

      apiSpy.post.and.returnValue(of(backendBooking));

      service.createBooking({
        stationId: validUuid,
        bookingDate: '2020-01-01',
        startTime: pastStartIso,
        endTime: pastEndIso,
        paymentMethod: 'CARD'
      }).subscribe((res) => {
        expect(apiSpy.post).toHaveBeenCalled();
        const callArgs = apiSpy.post.calls.mostRecent().args[1] as { startTime: string; endTime: string };
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
    it('should return empty array when useMocks is true', (done) => {
      const orig = environment.useMocks;
      environment.useMocks = true;

      service.getMyBookings().subscribe((bookings) => {
        expect(bookings).toEqual([]);
        environment.useMocks = orig;
        done();
      });
    });

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
