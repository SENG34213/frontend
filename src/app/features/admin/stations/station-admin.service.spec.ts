import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { StationAdminService } from './station-admin.service';
import { ApiService } from '../../../core/services/api.service';
import { Station, GameStationRequest, GameStationResponse, SlotAvailabilityResponse } from '../../../shared/models';

describe('StationAdminService', () => {
  let service: StationAdminService;
  let apiSpy: jasmine.SpyObj<ApiService>;

  const mockStation: Station = {
    id: 'st-001',
    stationNumber: 1,
    stationCode: 'CONSOLE-01',
    name: 'PS5 01',
    type: 'PS5',
    hourlyRate: 500,
    specifications: '4K OLED',
    controllersCount: 2,
    imageUrl: 'ps5.jpg',
    active: true
  };

  beforeEach(() => {
    apiSpy = jasmine.createSpyObj('ApiService', ['get', 'post', 'put', 'delete']);
    TestBed.configureTestingModule({
      providers: [
        StationAdminService,
        { provide: ApiService, useValue: apiSpy }
      ]
    });
    service = TestBed.inject(StationAdminService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should get all stations and enrich fallback stationCode and name', (done) => {
    const rawStations: Station[] = [
      mockStation,
      {
        id: '12345678-abcd',
        stationNumber: 2,
        stationCode: '',
        name: '',
        type: 'VR',
        hourlyRate: 700,
        specifications: '',
        imageUrl: '',
        controllersCount: 1,
        active: true
      }
    ];

    apiSpy.get.and.returnValue(of(rawStations));

    service.getAllStations().subscribe(stations => {
      expect(stations.length).toBe(2);
      expect(stations[0].stationCode).toBe('CONSOLE-01');
      expect(stations[1].stationCode).toBe('ST-1234');
      expect(stations[1].name).toBe('Station (VR)');
      done();
    });
  });

  it('should get station by ID', (done) => {
    apiSpy.get.and.returnValue(of(mockStation));

    service.getStationById('st-001').subscribe(res => {
      expect(res.id).toBe('st-001');
      expect(apiSpy.get).toHaveBeenCalledWith('/stations/st-001');
      done();
    });
  });

  it('should get slot availability with date param', (done) => {
    const mockSlots: SlotAvailabilityResponse[] = [
      { startTime: '10:00', endTime: '11:00', available: true }
    ];

    apiSpy.get.and.returnValue(of(mockSlots));

    service.getAvailability('st-001', '2026-10-19').subscribe(slots => {
      expect(slots.length).toBe(1);
      expect(apiSpy.get).toHaveBeenCalledWith('/stations/st-001/availability', jasmine.any(Object));
      done();
    });
  });

  it('should create a station via POST', (done) => {
    const req: GameStationRequest = {
      stationCode: 'CONSOLE-02',
      type: 'PS5',
      hourlyRate: 600,
      active: true
    };

    const mockResp: GameStationResponse = {
      id: 'st-002',
      stationCode: 'CONSOLE-02',
      type: 'PS5',
      hourlyRate: 600,
      active: true
    };

    apiSpy.post.and.returnValue(of(mockResp));

    service.createStation(req).subscribe(res => {
      expect(res.id).toBe('st-002');
      expect(apiSpy.post).toHaveBeenCalledWith('/stations', req);
      done();
    });
  });

  it('should update a station via PUT', (done) => {
    const req: GameStationRequest = {
      stationCode: 'CONSOLE-01-EDIT',
      type: 'PS5',
      hourlyRate: 650,
      active: true
    };

    const mockResp: GameStationResponse = {
      id: 'st-001',
      stationCode: 'CONSOLE-01-EDIT',
      type: 'PS5',
      hourlyRate: 650,
      active: true
    };

    apiSpy.put.and.returnValue(of(mockResp));

    service.updateStation('st-001', req).subscribe(res => {
      expect(res.stationCode).toBe('CONSOLE-01-EDIT');
      expect(apiSpy.put).toHaveBeenCalledWith('/stations/st-001', req);
      done();
    });
  });

  it('should delete a station via DELETE', (done) => {
    apiSpy.delete.and.returnValue(of(undefined));

    service.deleteStation('st-001').subscribe(() => {
      expect(apiSpy.delete).toHaveBeenCalledWith('/stations/st-001');
      done();
    });
  });
});
