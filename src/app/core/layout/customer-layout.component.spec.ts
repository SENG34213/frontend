import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { signal } from '@angular/core';
import { CustomerLayoutComponent } from './customer-layout.component';
import { AuthService } from '../services/auth.service';
import { NotificationSocketService } from '../services/notification-socket.service';

describe('CustomerLayoutComponent', () => {
  let component: CustomerLayoutComponent;
  let fixture: ComponentFixture<CustomerLayoutComponent>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let notifSocketSpy: jasmine.SpyObj<NotificationSocketService>;
  let router: Router;

  beforeEach(async () => {
    authServiceSpy = jasmine.createSpyObj('AuthService', ['logout'], {
      currentUser: signal({ email: 'player@gamingcastle.lk', role: 'CUSTOMER', sub: 'usr-1', userId: 'usr-1', iat: 0, exp: 9999999999 }),
      isAdmin: signal(false),
      isCustomer: signal(true),
      isSessionExpiring: signal(false)
    });

    notifSocketSpy = jasmine.createSpyObj('NotificationSocketService', [
      'toggleDrawer',
      'closeDrawer',
      'markAllAsRead',
      'markAsRead',
      'removeNotification',
      'clearAll',
      'sendTestAlert',
      'sendNotification'
    ], {
      notifications: signal([]),
      unreadCount: signal(3),
      isConnected: signal(true),
      isDrawerOpen: signal(false),
      activeFilter: signal('ALL'),
      filteredNotifications: signal([])
    });

    await TestBed.configureTestingModule({
      imports: [CustomerLayoutComponent],
      providers: [
        provideHttpClient(),
        provideRouter([]),
        { provide: AuthService, useValue: authServiceSpy },
        { provide: NotificationSocketService, useValue: notifSocketSpy }
      ]
    }).compileComponents();

    router = TestBed.inject(Router);
    spyOn(router, 'navigate');

    fixture = TestBed.createComponent(CustomerLayoutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the customer layout component', () => {
    expect(component).toBeTruthy();
    expect(component.mobileMenuOpen()).toBeFalse();
  });

  it('should close mobile menu', () => {
    component.mobileMenuOpen.set(true);
    component.closeMobileMenu();
    expect(component.mobileMenuOpen()).toBeFalse();
  });

  it('should logout and navigate to /login when onLogout is called', () => {
    component.onLogout();
    expect(authServiceSpy.logout).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('should toggle notification drawer when nav notification button is clicked', () => {
    const notifBtn = fixture.nativeElement.querySelector('#customer-nav-notif-btn');
    expect(notifBtn).toBeTruthy();
    notifBtn.click();
    expect(notifSocketSpy.toggleDrawer).toHaveBeenCalled();
  });

  it('should display unread notifications badge count', () => {
    const badge = fixture.nativeElement.querySelector('.nav-unread-badge');
    expect(badge).toBeTruthy();
    expect(badge.textContent.trim()).toBe('3');
  });
});
