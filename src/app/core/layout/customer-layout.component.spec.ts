import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { CustomerLayoutComponent } from './customer-layout.component';
import { AuthService } from '../services/auth.service';
import { UserService } from '../services/user.service';
import { NotificationSocketService } from '../services/notification-socket.service';
import { UserProfile } from '../../shared/models/user.model';

describe('CustomerLayoutComponent', () => {
  let component: CustomerLayoutComponent;
  let fixture: ComponentFixture<CustomerLayoutComponent>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let userServiceSpy: jasmine.SpyObj<UserService>;
  let notifSocketSpy: jasmine.SpyObj<NotificationSocketService>;
  let router: Router;

  const mockProfile: UserProfile = {
    id: 'usr-1',
    email: 'player@gamingcastle.lk',
    fullName: 'Kasun Perera',
    phoneNumber: '+94771234567',
    role: 'CUSTOMER',
    enabled: true,
    createdAt: '2026-09-02T10:00:00Z'
  };

  beforeEach(async () => {
    authServiceSpy = jasmine.createSpyObj('AuthService', ['logout'], {
      currentUser: signal({
        email: 'player@gamingcastle.lk',
        role: 'CUSTOMER',
        sub: 'usr-1',
        userId: 'usr-1',
        fullName: 'Kasun Perera',
        iat: 0,
        exp: 9999999999
      }),
      role: signal('CUSTOMER'),
      isAdmin: signal(false),
      isCustomer: signal(true),
      isSessionExpiring: signal(false),
      isAuthenticated: signal(true)
    });

    userServiceSpy = jasmine.createSpyObj('UserService', ['getMyProfile', 'clearCachedProfile'], {
      currentProfile: signal<UserProfile | null>(mockProfile),
      isLoading: signal(false)
    });
    userServiceSpy.getMyProfile.and.returnValue(of(mockProfile));

    notifSocketSpy = jasmine.createSpyObj('NotificationSocketService', [
      'toggleDrawer',
      'closeDrawer'
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
        { provide: UserService, useValue: userServiceSpy },
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
    expect(component.dropdownOpen()).toBeFalse();
  });

  describe('Avatar & User Details', () => {
    it('should display the first letter of user email in uppercase when no photo URL exists', () => {
      const avatarInitialEl = fixture.nativeElement.querySelector('.avatar-initial');
      expect(avatarInitialEl).toBeTruthy();
      expect(avatarInitialEl.textContent.trim()).toBe('P');
    });

    it('should render avatar img when profile has an image URL', () => {
      const profileWithPhoto: UserProfile = {
        ...mockProfile,
        profileImageUrl: 'https://example.com/avatar.jpg'
      };
      (userServiceSpy.currentProfile as unknown as ReturnType<typeof signal<UserProfile | null>>).set(profileWithPhoto);
      fixture.detectChanges();

      const imgEl = fixture.nativeElement.querySelector('.avatar-img');
      expect(imgEl).toBeTruthy();
      expect(imgEl.getAttribute('src')).toBe('https://example.com/avatar.jpg');
      expect(imgEl.getAttribute('alt')).toBe('Kasun Perera');
    });

    it('should fallback to letter initial when avatar image encounters error', () => {
      component.onImageError();
      fixture.detectChanges();

      expect(component.imageLoadFailed()).toBeTrue();
      const avatarInitialEl = fixture.nativeElement.querySelector('.avatar-initial');
      expect(avatarInitialEl).toBeTruthy();
      expect(avatarInitialEl.textContent.trim()).toBe('P');
    });
  });

  describe('Dropdown Menu Interaction', () => {
    it('should toggle dropdown open and closed on avatar button click', fakeAsync(() => {
      const avatarBtn = fixture.nativeElement.querySelector('#customer-avatar-btn');
      expect(avatarBtn).toBeTruthy();

      avatarBtn.click();
      fixture.detectChanges();
      tick();

      expect(component.dropdownOpen()).toBeTrue();
      expect(fixture.nativeElement.querySelector('#customer-user-dropdown')).toBeTruthy();

      avatarBtn.click();
      fixture.detectChanges();
      tick();

      expect(component.dropdownOpen()).toBeFalse();
      expect(fixture.nativeElement.querySelector('#customer-user-dropdown')).toBeFalsy();
    }));

    it('should display header section with full name, email and role badge', fakeAsync(() => {
      component.toggleDropdown();
      fixture.detectChanges();
      tick();

      const dropdown = fixture.nativeElement.querySelector('#customer-user-dropdown');
      expect(dropdown).toBeTruthy();

      const nameEl = dropdown.querySelector('.dropdown-user-name');
      const emailEl = dropdown.querySelector('.dropdown-user-email');
      expect(nameEl.textContent.trim()).toBe('Kasun Perera');
      expect(emailEl.textContent.trim()).toBe('player@gamingcastle.lk');
    }));

    it('should contain the 5 menu items in the exact required order', fakeAsync(() => {
      component.toggleDropdown();
      fixture.detectChanges();
      tick();

      const dropdown = fixture.nativeElement.querySelector('#customer-user-dropdown');
      const items = dropdown.querySelectorAll('[role="menuitem"]');
      expect(items.length).toBe(5);

      expect(items[0].getAttribute('href')).toBe('/profile');
      expect(items[0].textContent.trim()).toContain('Profile');

      expect(items[1].getAttribute('href')).toBe('/my-bookings');
      expect(items[1].textContent.trim()).toContain('My Bookings');

      expect(items[2].getAttribute('href')).toBe('/my-tournaments');
      expect(items[2].textContent.trim()).toContain('My Tournaments');

      expect(items[3].getAttribute('href')).toBe('/loyalty');
      expect(items[3].textContent.trim()).toContain('Loyalty');

      expect(items[4].textContent.trim()).toContain('Sign out');
    }));

    it('should close dropdown and open confirmation modal when Sign out is clicked, and logout on confirm', fakeAsync(() => {
      component.toggleDropdown();
      fixture.detectChanges();
      tick();

      const signOutBtn = fixture.nativeElement.querySelector('.logout-item');
      expect(signOutBtn).toBeTruthy();

      signOutBtn.click();
      fixture.detectChanges();
      tick();

      expect(component.dropdownOpen()).toBeFalse();
      expect(component.showLogoutModal()).toBeTrue();

      component.confirmLogout();
      tick();

      expect(component.showLogoutModal()).toBeFalse();
      expect(authServiceSpy.logout).toHaveBeenCalled();
      expect(router.navigate).toHaveBeenCalledWith(['/']);
    }));

    it('should dismiss sign out modal when cancelLogout is called', fakeAsync(() => {
      component.openLogoutModal();
      expect(component.showLogoutModal()).toBeTrue();

      component.cancelLogout();
      expect(component.showLogoutModal()).toBeFalse();
      expect(authServiceSpy.logout).not.toHaveBeenCalled();
    }));

    it('should close dropdown on Escape key and return focus to avatar button', fakeAsync(() => {
      component.toggleDropdown();
      fixture.detectChanges();
      tick();

      const event = new KeyboardEvent('keydown', { key: 'Escape' });
      spyOn(event, 'preventDefault');

      component.onMenuKeydown(event);
      fixture.detectChanges();

      expect(component.dropdownOpen()).toBeFalse();
      expect(event.preventDefault).toHaveBeenCalled();
    }));

    it('should navigate between items with ArrowDown and ArrowUp', fakeAsync(() => {
      component.toggleDropdown();
      fixture.detectChanges();
      tick();

      const items = fixture.nativeElement.querySelectorAll('[role="menuitem"]');
      items[0].focus();

      const downEvent = new KeyboardEvent('keydown', { key: 'ArrowDown' });
      component.onMenuKeydown(downEvent);
      expect(document.activeElement).toBe(items[1]);

      const upEvent = new KeyboardEvent('keydown', { key: 'ArrowUp' });
      component.onMenuKeydown(upEvent);
      expect(document.activeElement).toBe(items[0]);
    }));

    it('should close dropdown on document click outside dropdown', fakeAsync(() => {
      component.toggleDropdown();
      fixture.detectChanges();
      tick();

      expect(component.dropdownOpen()).toBeTrue();

      document.body.click();
      fixture.detectChanges();

      expect(component.dropdownOpen()).toBeFalse();
    }));
  });

  describe('Mobile Menu and Notifications', () => {
    it('should close mobile menu when closeMobileMenu() is called', () => {
      component.mobileMenuOpen.set(true);
      component.closeMobileMenu();
      expect(component.mobileMenuOpen()).toBeFalse();
    });

    it('should not render a notification bell in the header', () => {
      expect(fixture.nativeElement.querySelector('.nav-notif-btn')).toBeNull();
    });

    it('should render one floating notification bell with the unread count', () => {
      const notifButtons = fixture.nativeElement.querySelectorAll('.notification-trigger-btn');
      expect(notifButtons.length).toBe(1);

      const badge = fixture.nativeElement.querySelector('.unread-badge');
      expect(badge).toBeTruthy();
      expect(badge.textContent.trim()).toBe('3');

      notifButtons[0].click();
      expect(notifSocketSpy.toggleDrawer).toHaveBeenCalled();
    });

    it('should render footer links for Location, Privacy, Terms, and Support', () => {
      const footerLinks = fixture.nativeElement.querySelectorAll('.footer-links a');
      expect(footerLinks.length).toBe(4);
      expect(footerLinks[0].getAttribute('href') || footerLinks[0].getAttribute('ng-reflect-router-link')).toContain('location');
      expect(footerLinks[1].getAttribute('href') || footerLinks[1].getAttribute('ng-reflect-router-link')).toContain('privacy');
      expect(footerLinks[2].getAttribute('href') || footerLinks[2].getAttribute('ng-reflect-router-link')).toContain('terms');
      expect(footerLinks[3].getAttribute('href') || footerLinks[3].getAttribute('ng-reflect-router-link')).toContain('support');
    });
  });

  describe('Guest / Landing Page Mode (Unauthenticated)', () => {
    beforeEach(() => {
      authServiceSpy.currentUser.set(null);
      (authServiceSpy.isAuthenticated as any).set(false);
      fixture.detectChanges();
    });

    it('should render LOG IN and REGISTER buttons in header for guests', () => {
      const loginBtn = fixture.nativeElement.querySelector('#header-login-btn');
      const registerBtn = fixture.nativeElement.querySelector('#header-register-btn');
      expect(loginBtn).toBeTruthy();
      expect(registerBtn).toBeTruthy();
      expect(fixture.nativeElement.querySelector('#customer-avatar-btn')).toBeNull();
    });

    it('should navigate to /login when goToLogin is called', () => {
      component.goToLogin();
      expect(router.navigate).toHaveBeenCalledWith(['/login']);
    });

    it('should navigate to /register when goToRegister is called', () => {
      component.goToRegister();
      expect(router.navigate).toHaveBeenCalledWith(['/register']);
    });

    it('should intercept protected nav clicks and redirect to /login with returnUrl', () => {
      const dummyEvent = new MouseEvent('click');
      spyOn(dummyEvent, 'preventDefault');

      component.onNavClick('/tournaments', dummyEvent);
      expect(dummyEvent.preventDefault).toHaveBeenCalled();
      expect(router.navigate).toHaveBeenCalledWith(['/login'], {
        queryParams: { returnUrl: '/tournaments' }
      });
    });
  });
});
