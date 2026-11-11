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
    loyaltyServiceSpy = jasmine.createSpyObj('LoyaltyService', [
      'getBalance',
      'refreshBalance',
      'userTier',
      'userPoints',
      'silverThreshold',
      'goldThreshold',
      'silverMultiplier',
      'goldMultiplier'
    ]);
    loyaltyServiceSpy.userTier.and.returnValue('SILVER');
    loyaltyServiceSpy.userPoints.and.returnValue(1250);
    loyaltyServiceSpy.silverThreshold.and.returnValue(1000);
    loyaltyServiceSpy.goldThreshold.and.returnValue(3000);
    loyaltyServiceSpy.silverMultiplier.and.returnValue(1.25);
    loyaltyServiceSpy.goldMultiplier.and.returnValue(1.50);
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

  it('should open edit modal when openEditModal is called', () => {
    fixture.detectChanges();
    expect(component.editModalOpen()).toBeFalse();

    component.openEditModal();
    expect(component.editModalOpen()).toBeTrue();
  });

  it('should update profile state and reload on onProfileUpdated', () => {
    fixture.detectChanges();
    const updatedUser: UserProfile = {
      ...mockProfile,
      fullName: 'Updated Kasun',
      phoneNumber: '+94770000000',
      avatarUrl: 'https://example.com/new-avatar.png'
    };
    userServiceSpy.getMyProfile.and.returnValue(of(updatedUser));

    component.onProfileUpdated(updatedUser);

    expect(component.profile()?.fullName).toBe('Updated Kasun');
    expect(component.imageLoadFailed()).toBeFalse();
    expect(userServiceSpy.getMyProfile).toHaveBeenCalledWith(true);
  });

  it('should calculate SILVER tier and progress to GOLD for a user with 1624 points', () => {
    loyaltyServiceSpy.getBalance.and.returnValue(of({
      userId: 'usr-1',
      pointsBalance: 1624,
      tier: 'SILVER',
      equivalentDiscountLkr: 1624,
      silverThreshold: 1000,
      goldThreshold: 3000,
      silverMultiplier: 1.25,
      goldMultiplier: 1.50
    }));

    component.loadProfileData();
    fixture.detectChanges();

    expect(component.loyaltyTier()).toBe('SILVER');
    expect(component.pointsBalance()).toBe(1624);
    expect(component.silverThreshold()).toBe(1000);
    expect(component.goldThreshold()).toBe(3000);

    const progress = component.nextTierProgress();
    expect(progress.nextTier).toBe('GOLD');
    expect(progress.pointsNeeded).toBe(3001 - 1624); // 1377
    expect(progress.percent).toBe(Math.round(((1624 - 1000) / 2000) * 100)); // 31%
  });

  it('should dynamically update milestone thresholds from backend admin settings', () => {
    loyaltyServiceSpy.getBalance.and.returnValue(of({
      userId: 'usr-1',
      pointsBalance: 1624,
      tier: 'BRONZE',
      equivalentDiscountLkr: 1624,
      silverThreshold: 2000,
      goldThreshold: 5000,
      silverMultiplier: 1.30,
      goldMultiplier: 1.60
    }));

    component.loadProfileData();
    fixture.detectChanges();

    expect(component.silverThreshold()).toBe(2000);
    expect(component.goldThreshold()).toBe(5000);
    expect(component.silverMultiplier()).toBe(1.30);
    expect(component.goldMultiplier()).toBe(1.60);

    const progress = component.nextTierProgress();
    expect(progress.nextTier).toBe('SILVER');
    expect(progress.pointsNeeded).toBe(2000 - 1624); // 376
  });

  it('should compute MAX TIER when points exceed goldThreshold', () => {
    loyaltyServiceSpy.getBalance.and.returnValue(of({
      userId: 'usr-1',
      pointsBalance: 4000,
      tier: 'GOLD',
      equivalentDiscountLkr: 4000,
      silverThreshold: 1000,
      goldThreshold: 3000
    }));

    component.loadProfileData();
    fixture.detectChanges();

    const progress = component.nextTierProgress();
    expect(progress.nextTier).toBe('MAX TIER');
    expect(progress.pointsNeeded).toBe(0);
    expect(progress.percent).toBe(100);
  });

  it('should display singular point label when exactly 1 point is needed for Gold', () => {
    loyaltyServiceSpy.getBalance.and.returnValue(of({
      userId: 'usr-1',
      pointsBalance: 3000,
      tier: 'SILVER',
      equivalentDiscountLkr: 3000,
      silverThreshold: 1000,
      goldThreshold: 3000
    }));

    component.loadProfileData();
    fixture.detectChanges();

    const progress = component.nextTierProgress();
    expect(progress.pointsNeeded).toBe(1);
    expect(progress.label).toBe('1 point to unlock Gold');
  });

  it('should map badge variants, glow classes, and multiplier labels correctly for all tiers', () => {
    // SILVER
    loyaltyServiceSpy.getBalance.and.returnValue(of({
      userId: 'usr-1',
      pointsBalance: 1500,
      tier: 'SILVER',
      silverMultiplier: 1.25,
      goldMultiplier: 1.50
    }));
    component.loadProfileData();
    expect(component.tierBadgeVariant()).toBe('accent');
    expect(component.tierIcon()).toBe('🥈');
    expect(component.tierGlowClass()).toBe('tier-silver-ring');
    expect(component.tierMultiplierLabel()).toContain('1.25x');

    // GOLD
    loyaltyServiceSpy.getBalance.and.returnValue(of({
      userId: 'usr-1',
      pointsBalance: 3500,
      tier: 'GOLD',
      silverMultiplier: 1.25,
      goldMultiplier: 1.50
    }));
    component.loadProfileData();
    expect(component.tierBadgeVariant()).toBe('warning');
    expect(component.tierIcon()).toBe('🥇');
    expect(component.tierGlowClass()).toBe('tier-gold-ring');
    expect(component.tierMultiplierLabel()).toContain('1.5x');

    // BRONZE
    loyaltyServiceSpy.getBalance.and.returnValue(of({
      userId: 'usr-1',
      pointsBalance: 200,
      tier: 'BRONZE',
      silverMultiplier: 1.25,
      goldMultiplier: 1.50
    }));
    component.loadProfileData();
    expect(component.tierBadgeVariant()).toBe('info');
    expect(component.tierIcon()).toBe('🥉');
    expect(component.tierGlowClass()).toBe('tier-bronze-ring');
    expect(component.tierMultiplierLabel()).toBe('1.0x Standard Points Rate');
  });

  it('should format dates gracefully and handle missing dates', () => {
    expect(component.formatDate(undefined)).toBe('Active Member');
    const formatted = component.formatDate('2026-09-02T10:00:00Z');
    expect(formatted).toContain('2026');
  });

  it('should fallback discountValue to pointsBalance when equivalentDiscountLkr is null', () => {
    loyaltyServiceSpy.getBalance.and.returnValue(of({
      userId: 'usr-1',
      pointsBalance: 500,
      tier: 'BRONZE',
      equivalentDiscountLkr: null as any
    }));
    component.loadProfileData();
    expect(component.discountValue()).toBe(500);
  });
});
