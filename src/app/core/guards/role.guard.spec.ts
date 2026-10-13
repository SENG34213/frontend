import { TestBed } from '@angular/core/testing';
import { Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { roleGuard } from './role.guard';
import { AuthService } from '../services/auth.service';

describe('roleGuard', () => {
  let router: jasmine.SpyObj<Router>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;

  beforeEach(() => {
    router = jasmine.createSpyObj('Router', ['navigate']);
    authServiceSpy = jasmine.createSpyObj('AuthService', ['isAuthenticated', 'role']);

    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: router },
        { provide: AuthService, useValue: authServiceSpy }
      ]
    });
  });

  it('should redirect unauthenticated users to /login with returnUrl', () => {
    authServiceSpy.isAuthenticated.and.returnValue(false);

    const route = { data: { role: 'ADMIN' } } as unknown as ActivatedRouteSnapshot;
    const state = { url: '/admin' } as RouterStateSnapshot;

    const result = TestBed.runInInjectionContext(() => roleGuard(route, state));
    expect(result).toBeFalse();
    expect(router.navigate).toHaveBeenCalledWith(['/login'], { queryParams: { returnUrl: '/admin' } });
  });

  it('should redirect authenticated users to /forbidden when role does not match', () => {
    authServiceSpy.isAuthenticated.and.returnValue(true);
    authServiceSpy.role.and.returnValue('CUSTOMER');

    const route = { data: { role: 'ADMIN' } } as unknown as ActivatedRouteSnapshot;
    const state = { url: '/admin' } as RouterStateSnapshot;

    const result = TestBed.runInInjectionContext(() => roleGuard(route, state));
    expect(result).toBeFalse();
    expect(router.navigate).toHaveBeenCalledWith(['/forbidden']);
  });

  it('should allow navigation when authenticated user matches required role', () => {
    authServiceSpy.isAuthenticated.and.returnValue(true);
    authServiceSpy.role.and.returnValue('ADMIN');

    const route = { data: { role: 'ADMIN' } } as unknown as ActivatedRouteSnapshot;
    const state = { url: '/admin' } as RouterStateSnapshot;

    const result = TestBed.runInInjectionContext(() => roleGuard(route, state));
    expect(result).toBeTrue();
    expect(router.navigate).not.toHaveBeenCalled();
  });
});
