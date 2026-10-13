import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { errorInterceptor } from './error.interceptor';
import { AuthService } from '../services/auth.service';
import { ToastService } from '../../shared/ui/toast/toast.service';

describe('errorInterceptor', () => {
  let httpClient: HttpClient;
  let httpMock: HttpTestingController;
  let routerSpy: jasmine.SpyObj<Router>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let toastServiceSpy: jasmine.SpyObj<ToastService>;

  beforeEach(() => {
    routerSpy = jasmine.createSpyObj('Router', ['navigate'], { url: '/dashboard' });
    authServiceSpy = jasmine.createSpyObj('AuthService', ['logout']);
    toastServiceSpy = jasmine.createSpyObj('ToastService', ['warning', 'error']);

    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: routerSpy },
        { provide: AuthService, useValue: authServiceSpy },
        { provide: ToastService, useValue: toastServiceSpy },
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting()
      ]
    });

    httpClient = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should handle 401 error by triggering logout, warning toast, and redirect to /login with returnUrl', () => {
    httpClient.get('/api/bookings/mine').subscribe({
      next: () => fail('Should have failed with 401'),
      error: (err) => {
        expect(err.status).toBe(401);
        expect(authServiceSpy.logout).toHaveBeenCalledWith('/dashboard');
        expect(toastServiceSpy.warning).toHaveBeenCalled();
        expect(routerSpy.navigate).toHaveBeenCalledWith(['/login'], {
          queryParams: { returnUrl: '/dashboard' }
        });
      }
    });

    const req = httpMock.expectOne('/api/bookings/mine');
    req.flush({ message: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });
  });

  it('should handle 403 error by navigating to /forbidden', () => {
    httpClient.get('/api/admin/reports').subscribe({
      next: () => fail('Should have failed with 403'),
      error: (err) => {
        expect(err.status).toBe(403);
        expect(routerSpy.navigate).toHaveBeenCalledWith(['/forbidden']);
      }
    });

    const req = httpMock.expectOne('/api/admin/reports');
    req.flush({ message: 'Forbidden' }, { status: 403, statusText: 'Forbidden' });
  });

  it('should handle 500 error by triggering toast error notification', () => {
    httpClient.get('/api/stations').subscribe({
      next: () => fail('Should have failed with 500'),
      error: (err) => {
        expect(err.status).toBe(500);
        expect(toastServiceSpy.error).toHaveBeenCalled();
      }
    });

    const req = httpMock.expectOne('/api/stations');
    req.flush({ message: 'Internal Server Error' }, { status: 500, statusText: 'Server Error' });
  });
});
