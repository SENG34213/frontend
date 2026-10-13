import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApiService } from './api.service';

describe('ApiService', () => {
  let service: ApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ApiService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });

    service = TestBed.inject(ApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should resolve relative endpoint and execute GET', () => {
    service.get<{ id: string }>('/stations').subscribe((data) => {
      expect(data.id).toBe('st-1');
    });

    const req = httpMock.expectOne('/api/stations');
    expect(req.request.method).toBe('GET');
    req.flush({ id: 'st-1' });
  });

  it('should execute POST with body', () => {
    service.post('/bookings', { stationId: 'st-1' }).subscribe();

    const req = httpMock.expectOne('/api/bookings');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ stationId: 'st-1' });
    req.flush({});
  });

  it('should execute PUT with body', () => {
    service.put('/stations/1', { active: true }).subscribe();

    const req = httpMock.expectOne('/api/stations/1');
    expect(req.request.method).toBe('PUT');
    req.flush({});
  });

  it('should execute PATCH with body', () => {
    service.patch('/stations/1', { active: false }).subscribe();

    const req = httpMock.expectOne('/api/stations/1');
    expect(req.request.method).toBe('PATCH');
    req.flush({});
  });

  it('should execute DELETE', () => {
    service.delete('/bookings/1').subscribe();

    const req = httpMock.expectOne('/api/bookings/1');
    expect(req.request.method).toBe('DELETE');
    req.flush({});
  });

  it('should preserve absolute URLs starting with http', () => {
    service.get('https://example.com/api').subscribe();

    const req = httpMock.expectOne('https://example.com/api');
    expect(req.request.method).toBe('GET');
    req.flush({});
  });
});
