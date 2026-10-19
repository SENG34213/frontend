import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ProfileComponent } from './profile.component';
import { UserService } from '../../core/services/user.service';
import { LoyaltyService } from '../../core/services/loyalty.service';
import { AuthService } from '../../core/services/auth.service';
import { UserProfile } from '../../shared/models/user.model';
import { LoyaltyBalanceDto } from '../../shared/models/loyalty.model';

describe('ProfileComponent', () => {
  let component: ProfileComponent;
  let fixture: ComponentFixture<ProfileComponent>;
  let userServiceSpy: jasmine.SpyObj<UserService>;
  let loyaltyServiceSpy: jasmine.SpyObj<LoyaltyService>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;

  const mockProfile: UserProfile = {
    id: 'usr-1',
    email: 'player@gamingcastle.lk',
    fullName: 'Kasun Perera',
    phoneNumber: '+94771234567',
    role: 'CUSTOMER',
    enabled: true,
    createdAt: '2026-09-02T10:00:00Z'
  };

  const mockLoyalty: LoyaltyBalanceDto = {
    userId: 'usr-1',
    pointsBalance: 1250,
    tier: 'GOLD',
    equivalentDiscountLkr: 1250
  };

  beforeEach(async () => {
    userServiceSpy = jasmine.createSpyObj('UserService', ['getMyProfile']);
    loyaltyServiceSpy = jasmine.createSpyObj('LoyaltyService', ['getBalance']);
    authServiceSpy = jasmine.createSpyObj('AuthService', ['getUserId', 'currentUser'], {
      currentUser: jasmine.createSpy('currentUser').and.returnValue({
        userId: 'usr-1',
        email: 'player@gamingcastle.lk',
        sub: 'usr-1',
        role: 'CUSTOMER',
        iat: 0,
        exp: 9999999999
      })
    });
    authServiceSpy.getUserId.and.returnValue('usr-1');

    userServiceSpy.getMyProfile.and.returnValue(of(mockProfile));
    loyaltyServiceSpy.getBalance.and.returnValue(of(mockLoyalty));

    await TestBed.configureTestingModule({
      imports: [ProfileComponent],
      providers: [
        provideRouter([]),
        { provide: UserService, useValue: userServiceSpy },
        { provide: LoyaltyService, useValue: loyaltyServiceSpy },
        { provide: AuthService, useValue: authServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ProfileComponent);
    component = fixture.componentInstance;
  });

  it('should create profile component', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should load profile and loyalty data on init', () => {
    fixture.detectChanges();
    expect(component.isLoading()).toBeFalse();
    expect(component.profile()).toEqual(mockProfile);
    expect(component.loyalty()).toEqual(mockLoyalty);

    const nameEl = fixture.nativeElement.querySelector('.user-fullname');
    expect(nameEl.textContent.trim()).toBe('Kasun Perera');

    const emailEl = fixture.nativeElement.querySelector('.user-email-text');
    expect(emailEl.textContent.trim()).toBe('player@gamingcastle.lk');
  });

  it('should render uppercase initial letter when no avatar image URL is provided', () => {
    fixture.detectChanges();
    const avatarLetter = fixture.nativeElement.querySelector('.avatar-letter');
    expect(avatarLetter).toBeTruthy();
    expect(avatarLetter.textContent.trim()).toBe('P');
  });

  it('should render image when photo URL is present', () => {
    userServiceSpy.getMyProfile.and.returnValue(of({
      ...mockProfile,
      profileImageUrl: 'https://example.com/avatar.jpg'
    }));
    fixture.detectChanges();

    const img = fixture.nativeElement.querySelector('.avatar-photo');
    expect(img).toBeTruthy();
    expect(img.getAttribute('src')).toBe('https://example.com/avatar.jpg');
  });

  it('should fallback to initial letter when photo fails to load', () => {
    userServiceSpy.getMyProfile.and.returnValue(of({
      ...mockProfile,
      profileImageUrl: 'https://example.com/broken.jpg'
    }));
    fixture.detectChanges();

    component.onImageError();
    fixture.detectChanges();

    expect(component.imageLoadFailed()).toBeTrue();
    const avatarLetter = fixture.nativeElement.querySelector('.avatar-letter');
    expect(avatarLetter).toBeTruthy();
    expect(avatarLetter.textContent.trim()).toBe('P');
  });

  it('should display error state when loading fails and allow retry', () => {
    userServiceSpy.getMyProfile.and.returnValue(throwError(() => new Error('API failure')));
    fixture.detectChanges();

    expect(component.hasError()).toBeTrue();
    expect(component.isLoading()).toBeFalse();

    const emptyState = fixture.nativeElement.querySelector('gc-empty-state');
    expect(emptyState).toBeTruthy();

    // Now make it succeed and click retry
    userServiceSpy.getMyProfile.and.returnValue(of(mockProfile));
    component.loadProfileData();
    fixture.detectChanges();

    expect(component.hasError()).toBeFalse();
    expect(component.profile()).toEqual(mockProfile);
  });
});
