import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { AdminLayoutComponent } from './admin-layout.component';
import { AuthService } from '../services/auth.service';
import { UserProfile } from '../../shared/models/auth.model';

describe('AdminLayoutComponent', () => {
  let component: AdminLayoutComponent;
  let fixture: ComponentFixture<AdminLayoutComponent>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let router: Router;

  beforeEach(async () => {
    const mockAdminProfile: UserProfile = {
      id: 'admin-1',
      email: 'admin@gamingcastle.lk',
      fullName: 'Admin User',
      role: 'ADMIN'
    };

    authServiceSpy = jasmine.createSpyObj('AuthService', ['logout', 'getMyProfile', 'getUserId'], {
      currentUser: signal({ email: 'admin@gamingcastle.lk', role: 'ADMIN', sub: 'admin-1', userId: 'admin-1', iat: 0, exp: 9999999999 }),
      isAuthenticated: signal(true),
      userProfile: signal(null),
      role: signal('ADMIN')
    });
    authServiceSpy.getUserId.and.returnValue('admin-1');
    authServiceSpy.getMyProfile.and.returnValue(of(mockAdminProfile));

    await TestBed.configureTestingModule({
      imports: [AdminLayoutComponent],
      providers: [
        provideHttpClient(),
        provideRouter([]),
        { provide: AuthService, useValue: authServiceSpy }
      ]
    }).compileComponents();

    router = TestBed.inject(Router);
    spyOn(router, 'navigate');

    fixture = TestBed.createComponent(AdminLayoutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the admin layout component', () => {
    expect(component).toBeTruthy();
    expect(component.sidebarCollapsed()).toBeFalse();
  });

  it('should logout and navigate to /login when onLogout is called', () => {
    component.onLogout();
    expect(authServiceSpy.logout).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('should open logout modal when openLogoutModal is called', () => {
    expect(component.showLogoutModal()).toBeFalse();
    component.openLogoutModal();
    expect(component.showLogoutModal()).toBeTrue();
  });

  it('should close logout modal without logging out when cancelLogout is called', () => {
    component.openLogoutModal();
    expect(component.showLogoutModal()).toBeTrue();
    component.cancelLogout();
    expect(component.showLogoutModal()).toBeFalse();
    expect(authServiceSpy.logout).not.toHaveBeenCalled();
  });

  it('should close logout modal, logout, and navigate to /login on confirmLogout', () => {
    component.openLogoutModal();
    expect(component.showLogoutModal()).toBeTrue();
    component.confirmLogout();
    expect(component.showLogoutModal()).toBeFalse();
    expect(authServiceSpy.logout).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });
});
