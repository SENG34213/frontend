import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from '../services/auth.service';

describe('authInterceptor', () => {
  let httpClient: HttpClient;
  let httpMock: HttpTestingController;
  let authServiceSpy: jasmine.SpyObj<AuthService>;

  beforeEach(() => {
    authServiceSpy = jasmine.createSpyObj('AuthService', ['getToken']);

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting()
      ]
    });

    httpClient = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should attach Authorization Bearer header when token exists and endpoint is protected', () => {
    authServiceSpy.getToken.and.returnValue('mock-token-xyz');

    httpClient.get('/api/stations').subscribe();

    const req = httpMock.expectOne('/api/stations');
    expect(req.request.headers.has('Authorization')).toBeTrue();
    expect(req.request.headers.get('Authorization')).toBe('Bearer mock-token-xyz');
    req.flush([]);
  });

  it('should not attach Authorization header for public login endpoint', () => {
    authServiceSpy.getToken.and.returnValue('mock-token-xyz');

    httpClient.post('/api/auth/login', {}).subscribe();

    const req = httpMock.expectOne('/api/auth/login');
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush({});
  });

  it('should not attach Authorization header for public register endpoint', () => {
    authServiceSpy.getToken.and.returnValue('mock-token-xyz');

    httpClient.post('/api/auth/register', {}).subscribe();

    const req = httpMock.expectOne('/api/auth/register');
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush({});
  });

  it('should not attach Authorization header when no token exists', () => {
    authServiceSpy.getToken.and.returnValue(null);

    httpClient.get('/api/stations').subscribe();

    const req = httpMock.expectOne('/api/stations');
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush([]);
  });
});
