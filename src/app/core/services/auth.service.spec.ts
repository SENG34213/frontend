import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthService, TOKEN_KEY, ROLE_KEY } from './auth.service';
import { AuthResponse, LoginRequest, RegisterRequest } from '../../shared/models/auth.model';

function createMockJwt(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = btoa(JSON.stringify(payload));
  return `${header}.${body}.dummy-signature`;
}

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        AuthService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('should initialize with unauthenticated state when storage is empty', () => {
    expect(service.isAuthenticated()).toBeFalse();
    expect(service.role()).toBeNull();
    expect(service.currentUser()).toBeNull();
    expect(service.isAdmin()).toBeFalse();
  });

  it('should login and store token and extract role', () => {
    const mockToken = createMockJwt({
      sub: 'usr-123',
      email: 'player@gamingcastle.lk',
      role: 'CUSTOMER',
      exp: Math.floor(Date.now() / 1000) + 3600
    });

    const mockResponse: AuthResponse = {
      accessToken: mockToken,
      tokenType: 'Bearer',
      userId: 'usr-123',
      email: 'player@gamingcastle.lk',
      role: 'CUSTOMER'
    };

    const loginReq: LoginRequest = { email: 'player@gamingcastle.lk', password: 'password123' };

    service.login(loginReq).subscribe((res) => {
      expect(res.accessToken).toBe(mockToken);
      expect(service.isAuthenticated()).toBeTrue();
      expect(service.role()).toBe('CUSTOMER');
      expect(service.currentUser()?.email).toBe('player@gamingcastle.lk');
      expect(service.isAdmin()).toBeFalse();
      expect(service.isCustomer()).toBeTrue();
    });

    const req = httpMock.expectOne('/api/auth/login');
    expect(req.request.method).toBe('POST');
    req.flush(mockResponse);
  });

  it('should register and store session for admin user', () => {
    const mockToken = createMockJwt({
      sub: 'admin-1',
      email: 'admin@gamingcastle.lk',
      role: 'ADMIN',
      exp: Math.floor(Date.now() / 1000) + 3600
    });

    const mockResponse: AuthResponse = {
      accessToken: mockToken,
      tokenType: 'Bearer',
      userId: 'admin-1',
      email: 'admin@gamingcastle.lk',
      role: 'ADMIN'
    };

    const regReq: RegisterRequest = {
      fullName: 'Admin User',
      email: 'admin@gamingcastle.lk',
      password: 'adminPassword123'
    };

    service.register(regReq).subscribe((res) => {
      expect(res.role).toBe('ADMIN');
      expect(service.isAdmin()).toBeTrue();
      expect(localStorage.getItem(TOKEN_KEY)).toBe(mockToken);
      expect(localStorage.getItem(ROLE_KEY)).toBe('ADMIN');
    });

    const req = httpMock.expectOne('/api/auth/register');
    expect(req.request.method).toBe('POST');
    req.flush(mockResponse);
  });

  it('should clear session and signals on logout', () => {
    localStorage.setItem(TOKEN_KEY, 'some-token');
    localStorage.setItem(ROLE_KEY, 'CUSTOMER');

    service.logout();

    expect(service.isAuthenticated()).toBeFalse();
    expect(service.getToken()).toBeNull();
    expect(service.role()).toBeNull();
    expect(service.currentUser()).toBeNull();
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
  });

  it('should correctly detect expired tokens', () => {
    const expiredToken = createMockJwt({
      sub: 'usr-1',
      role: 'CUSTOMER',
      exp: Math.floor(Date.now() / 1000) - 100 // past
    });

    localStorage.setItem(TOKEN_KEY, expiredToken);
    localStorage.setItem(ROLE_KEY, 'CUSTOMER');

    const freshAuthService = TestBed.inject(AuthService);
    expect(freshAuthService.isTokenExpired()).toBeTrue();
  });

  it('should trigger session expiring warning when token approaches expiration', fakeAsync(() => {
    // Expires in 150 seconds (warning window is 120 seconds -> warning triggers in 30 seconds)
    const expSeconds = Math.floor(Date.now() / 1000) + 150;
    const mockToken = createMockJwt({
      sub: 'usr-warn',
      role: 'CUSTOMER',
      exp: expSeconds
    });

    service.login({ email: 'warn@gc.lk', password: 'pass' }).subscribe();
    const req = httpMock.expectOne('/api/auth/login');
    req.flush({
      accessToken: mockToken,
      tokenType: 'Bearer',
      userId: 'usr-warn',
      email: 'warn@gc.lk',
      role: 'CUSTOMER'
    });

    expect(service.isSessionExpiring()).toBeFalse();

    // Fast-forward 31 seconds
    tick(31000);
    expect(service.isSessionExpiring()).toBeTrue();

    service.logout();
  }));

  it('should return null when decoding an invalid token format', () => {
    expect(service.decodeToken('invalid-token-string')).toBeNull();
  });

  describe('startup with a stored token', () => {
    function createServiceWithStoredToken(token: string): AuthService {
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(ROLE_KEY, 'CUSTOMER');
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [AuthService, provideHttpClient(), provideHttpClientTesting()]
      });
      return TestBed.inject(AuthService);
    }

    it('should stay authenticated given a valid non-expired stored token', () => {
      // Arrange
      const token = createMockJwt({
        sub: 'usr-1',
        email: 'player@gamingcastle.lk',
        role: 'CUSTOMER',
        exp: Math.floor(Date.now() / 1000) + 3600
      });

      // Act
      const freshService = createServiceWithStoredToken(token);

      // Assert
      expect(freshService.isAuthenticated()).toBeTrue();
      expect(localStorage.getItem(TOKEN_KEY)).toBe(token);
    });

    it('should clear the session given an expired stored token', () => {
      // Arrange
      const token = createMockJwt({
        sub: 'usr-1',
        email: 'player@gamingcastle.lk',
        role: 'CUSTOMER',
        exp: Math.floor(Date.now() / 1000) - 60
      });

      // Act
      const freshService = createServiceWithStoredToken(token);

      // Assert
      expect(freshService.isAuthenticated()).toBeFalse();
      expect(freshService.token()).toBeNull();
      expect(freshService.role()).toBeNull();
      expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
      expect(localStorage.getItem(ROLE_KEY)).toBeNull();
    });

    it('should clear the session given a malformed stored token', () => {
      // Arrange & Act
      const freshService = createServiceWithStoredToken('not-a-jwt');

      // Assert
      expect(freshService.isAuthenticated()).toBeFalse();
      expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    });
  });

  describe('forgotPassword and resetPassword HTTP flow', () => {
    it('should send POST request to /api/auth/password/forgot', () => {
      service.forgotPassword('player@gamingcastle.lk').subscribe();
      const req = httpMock.expectOne('/api/auth/password/forgot');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ identifier: 'player@gamingcastle.lk' });
      req.flush(null, { status: 202, statusText: 'Accepted' });
    });

    it('should send POST request to /api/auth/password/reset', () => {
      const resetReq = {
        identifier: 'player@gamingcastle.lk',
        code: '123456',
        newPassword: 'NewPassword123!'
      };
      service.resetPassword(resetReq).subscribe();
      const req = httpMock.expectOne('/api/auth/password/reset');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(resetReq);
      req.flush(null, { status: 200, statusText: 'OK' });
    });

    it('should never call notification endpoints for password recovery', () => {
      const forgotReq = service.forgotPassword('player@gamingcastle.lk').subscribe();
      const forgotRequest = httpMock.expectOne('/api/auth/password/forgot');
      expect(forgotRequest.request.url).not.toContain('/api/notifications');
      forgotRequest.flush(null, { status: 202, statusText: 'Accepted' });

      const resetReq = {
        identifier: 'player@gamingcastle.lk',
        code: '123456',
        newPassword: 'NewPassword123!'
      };
      service.resetPassword(resetReq).subscribe();
      const resetRequest = httpMock.expectOne('/api/auth/password/reset');
      expect(resetRequest.request.url).not.toContain('/api/notifications');
      resetRequest.flush(null, { status: 200, statusText: 'OK' });
      expect(forgotReq).toBeDefined();
    });
  });
});
