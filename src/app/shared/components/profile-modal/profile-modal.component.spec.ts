import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { ProfileModalComponent } from './profile-modal.component';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../ui/toast/toast.service';
import { UserProfile } from '../../models/auth.model';

describe('ProfileModalComponent', () => {
  let component: ProfileModalComponent;
  let fixture: ComponentFixture<ProfileModalComponent>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let toastServiceSpy: jasmine.SpyObj<ToastService>;

  const mockUserProfile: UserProfile = {
    id: 'user-1',
    email: 'player@gamingcastle.lk',
    fullName: 'Kasun Perera',
    phoneNumber: '+94771234567',
    avatarUrl: 'https://example.com/avatar.jpg',
    role: 'CUSTOMER'
  };

  beforeEach(async () => {
    authServiceSpy = jasmine.createSpyObj('AuthService', [
      'getMyProfile',
      'updateMyProfile',
      'isAuthenticated'
    ], {
      userProfile: signal<UserProfile | null>(mockUserProfile),
      currentUser: signal({
        sub: 'user-1',
        email: 'player@gamingcastle.lk',
        fullName: 'Kasun Perera',
        role: 'CUSTOMER',
        avatarUrl: 'https://example.com/avatar.jpg',
        iat: 0,
        exp: 9999999999
      })
    });
    authServiceSpy.isAuthenticated.and.returnValue(true);
    authServiceSpy.getMyProfile.and.returnValue(of(mockUserProfile));
    authServiceSpy.updateMyProfile.and.returnValue(of(mockUserProfile));

    toastServiceSpy = jasmine.createSpyObj('ToastService', ['success', 'error', 'info', 'warning']);

    await TestBed.configureTestingModule({
      imports: [ProfileModalComponent],
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        { provide: ToastService, useValue: toastServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ProfileModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the profile modal component', () => {
    expect(component).toBeTruthy();
    expect(component.isSaving()).toBeFalse();
    expect(component.errorMessage()).toBeNull();
  });

  it('should populate fields on ngOnChanges when isOpen becomes true', () => {
    component.isOpen = true;
    component.ngOnChanges({
      isOpen: {
        currentValue: true,
        previousValue: false,
        firstChange: false,
        isFirstChange: () => false
      }
    });

    expect(component.fullName()).toBe('Kasun Perera');
    expect(component.phoneNumber()).toBe('+94771234567');
    expect(component.avatarUrl()).toBe('https://example.com/avatar.jpg');
    expect(component.email()).toBe('player@gamingcastle.lk');
    expect(component.role()).toBe('CUSTOMER');
  });

  it('should fallback to currentUser and server fetch if userProfile is null', () => {
    (authServiceSpy.userProfile as WritableSignal<UserProfile | null>).set(null);
    authServiceSpy.getMyProfile.and.returnValue(of({
      id: 'user-2',
      email: 'fetched@gamingcastle.lk',
      fullName: 'Fetched User',
      phoneNumber: '+94779999999',
      avatarUrl: 'https://example.com/fetched.jpg',
      role: 'ADMIN'
    }));

    component.isOpen = true;
    component.ngOnChanges({
      isOpen: {
        currentValue: true,
        previousValue: false,
        firstChange: false,
        isFirstChange: () => false
      }
    });

    expect(authServiceSpy.getMyProfile).toHaveBeenCalled();
    expect(component.fullName()).toBe('Fetched User');
    expect(component.phoneNumber()).toBe('+94779999999');
    expect(component.avatarUrl()).toBe('https://example.com/fetched.jpg');
    expect(component.email()).toBe('fetched@gamingcastle.lk');
    expect(component.role()).toBe('ADMIN');
  });

  it('should update avatarUrl when onImageChange is called', () => {
    component.onImageChange('https://example.com/new-pic.png');
    expect(component.avatarUrl()).toBe('https://example.com/new-pic.png');
  });

  it('should show error message if full name is empty on save', () => {
    component.fullName.set('   ');
    component.saveProfile();

    expect(component.errorMessage()).toBe('Full name cannot be empty.');
    expect(authServiceSpy.updateMyProfile).not.toHaveBeenCalled();
  });

  it('should save profile successfully and close modal', () => {
    spyOn(component.closed, 'emit');
    spyOn(component.isOpenChange, 'emit');

    component.fullName.set('Updated Name');
    component.phoneNumber.set('+94775555555');
    component.avatarUrl.set('https://example.com/updated.jpg');

    component.saveProfile();

    expect(authServiceSpy.updateMyProfile).toHaveBeenCalledWith({
      fullName: 'Updated Name',
      phoneNumber: '+94775555555',
      avatarUrl: 'https://example.com/updated.jpg'
    });
    expect(toastServiceSpy.success).toHaveBeenCalledWith('Profile updated successfully!');
    expect(component.closed.emit).toHaveBeenCalled();
    expect(component.isOpenChange.emit).toHaveBeenCalledWith(false);
    expect(component.isSaving()).toBeFalse();
  });

  it('should omit empty phoneNumber and avatarUrl on save', () => {
    component.fullName.set('Solo Name');
    component.phoneNumber.set('');
    component.avatarUrl.set('   ');

    component.saveProfile();

    expect(authServiceSpy.updateMyProfile).toHaveBeenCalledWith({
      fullName: 'Solo Name',
      phoneNumber: undefined,
      avatarUrl: undefined
    });
  });

  it('should handle error when updateMyProfile fails', () => {
    authServiceSpy.updateMyProfile.and.returnValue(
      throwError(() => ({ error: { message: 'Network error updating profile' } }))
    );

    component.fullName.set('Valid Name');
    component.saveProfile();

    expect(component.isSaving()).toBeFalse();
    expect(component.errorMessage()).toBe('Network error updating profile');
    expect(toastServiceSpy.error).toHaveBeenCalledWith('Failed to update profile');
  });

  it('should handle fallback error message when error object has no message property', () => {
    authServiceSpy.updateMyProfile.and.returnValue(throwError(() => ({})));

    component.fullName.set('Valid Name');
    component.saveProfile();

    expect(component.isSaving()).toBeFalse();
    expect(component.errorMessage()).toBe('Failed to update profile.');
  });

  it('should close modal on closeModal call', () => {
    spyOn(component.closed, 'emit');
    spyOn(component.isOpenChange, 'emit');
    component.isOpen = true;

    component.closeModal();

    expect(component.isOpen).toBeFalse();
    expect(component.isOpenChange.emit).toHaveBeenCalledWith(false);
    expect(component.closed.emit).toHaveBeenCalled();
  });
});
