import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RegisterComponent } from './register.component';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { Router, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthResponse } from '../../../shared/models/auth.model';

describe('RegisterComponent', () => {
  let component: RegisterComponent;
  let fixture: ComponentFixture<RegisterComponent>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let toastServiceSpy: jasmine.SpyObj<ToastService>;
  let router: Router;

  beforeEach(async () => {
    authServiceSpy = jasmine.createSpyObj('AuthService', ['register']);
    toastServiceSpy = jasmine.createSpyObj('ToastService', ['success', 'error']);

    await TestBed.configureTestingModule({
      imports: [RegisterComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authServiceSpy },
        { provide: ToastService, useValue: toastServiceSpy }
      ]
    }).compileComponents();

    router = TestBed.inject(Router);
    spyOn(router, 'navigate');

    fixture = TestBed.createComponent(RegisterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the register component', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with invalid empty form', () => {
    expect(component.form.valid).toBeFalse();
  });

  it('should validate full name, email, phone, and password length', () => {
    const fullNameCtrl = component.form.controls.fullName;
    const emailCtrl = component.form.controls.email;
    const phoneCtrl = component.form.controls.phoneNumber;
    const passwordCtrl = component.form.controls.password;

    fullNameCtrl.setValue('');
    expect(fullNameCtrl.valid).toBeFalse();
    fullNameCtrl.setValue('J');
    expect(fullNameCtrl.valid).toBeFalse();
    fullNameCtrl.setValue('John Doe');
    expect(fullNameCtrl.valid).toBeTrue();

    emailCtrl.setValue('invalid-email');
    expect(emailCtrl.valid).toBeFalse();
    emailCtrl.setValue('commander@citadel.com');
    expect(emailCtrl.valid).toBeTrue();

    // Phone is optional but if provided must be valid SL phone
    phoneCtrl.setValue('');
    expect(phoneCtrl.valid).toBeTrue();
    phoneCtrl.setValue('12345');
    expect(phoneCtrl.valid).toBeFalse();
    phoneCtrl.setValue('0771234567');
    expect(phoneCtrl.valid).toBeTrue();

    passwordCtrl.setValue('short');
    expect(passwordCtrl.valid).toBeFalse();
    passwordCtrl.setValue('Password123!');
    expect(passwordCtrl.valid).toBeTrue();
  });

  it('should validate password and confirm password match', () => {
    component.form.controls.password.setValue('Password123!');
    component.form.controls.confirmPassword.setValue('MismatchPassword!');
    component.form.controls.confirmPassword.markAsDirty();
    component.form.updateValueAndValidity();

    expect(component.form.hasError('passwordsMismatch')).toBeTrue();
    expect(component.confirmPasswordErrorMessage).toBe('Passwords do not match.');

    component.form.controls.confirmPassword.setValue('Password123!');
    component.form.updateValueAndValidity();
    expect(component.form.hasError('passwordsMismatch')).toBeFalse();
  });

  it('should update password strength indication', () => {
    component.form.controls.password.setValue('12345');
    expect(component.passwordStrength).toBe('weak');

    component.form.controls.password.setValue('password123');
    expect(component.passwordStrength).toBe('fair');

    component.form.controls.password.setValue('GamingCastle2026!');
    expect(component.passwordStrength).toBe('strong');
  });

  it('should toggle password and confirm password visibilities', () => {
    expect(component.showPassword()).toBeFalse();
    component.togglePasswordVisibility();
    expect(component.showPassword()).toBeTrue();

    expect(component.showConfirmPassword()).toBeFalse();
    component.toggleConfirmPasswordVisibility();
    expect(component.showConfirmPassword()).toBeTrue();
  });

  it('should register successfully, trigger toast, and navigate to /dashboard', () => {
    authServiceSpy.register.and.returnValue(
      of({
        accessToken: 'mock-jwt-token',
        tokenType: 'Bearer',
        userId: 'u1',
        email: 'commander@citadel.com',
        role: 'CUSTOMER',
        notificationSent: true
      })
    );

    component.form.setValue({
      fullName: 'Commander Shepard',
      email: 'commander@citadel.com',
      phoneNumber: '0771234567',
      password: 'CitadelPassword123!',
      confirmPassword: 'CitadelPassword123!'
    });

    component.onSubmit();

    expect(authServiceSpy.register).toHaveBeenCalledWith({
      fullName: 'Commander Shepard',
      email: 'commander@citadel.com',
      phoneNumber: '0771234567',
      password: 'CitadelPassword123!'
    });
    expect(toastServiceSpy.success).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);
    expect(component.isSubmitting()).toBeFalse();
  });

  it('should not call authService on submit if form is invalid', () => {
    component.onSubmit();
    expect(authServiceSpy.register).not.toHaveBeenCalled();
    expect(component.form.touched).toBeTrue();
  });

  it('should prevent double submission when isSubmitting is true', () => {
    component.form.setValue({
      fullName: 'Commander Shepard',
      email: 'commander@citadel.com',
      phoneNumber: '0771234567',
      password: 'CitadelPassword123!',
      confirmPassword: 'CitadelPassword123!'
    });

    const mockAuthResponse: AuthResponse = {
      accessToken: 'mock-token',
      tokenType: 'Bearer',
      userId: 'u1',
      email: 'commander@citadel.com',
      role: 'CUSTOMER'
    };
    authServiceSpy.register.and.returnValue(of(mockAuthResponse));
    component.isSubmitting.set(true);

    component.onSubmit();

    expect(authServiceSpy.register).not.toHaveBeenCalled();
  });

  it('should handle EMAIL_TAKEN by displaying field error and sign-in link', () => {
    const errorResponse = new HttpErrorResponse({
      status: 409,
      error: { error: 'EMAIL_TAKEN', message: 'Email taken' }
    });
    authServiceSpy.register.and.returnValue(throwError(() => errorResponse));

    component.form.setValue({
      fullName: 'Commander Shepard',
      email: 'taken@citadel.com',
      phoneNumber: '',
      password: 'CitadelPassword123!',
      confirmPassword: 'CitadelPassword123!'
    });

    component.onSubmit();
    fixture.detectChanges();

    expect(component.emailTaken()).toBeTrue();
    expect(toastServiceSpy.error).toHaveBeenCalledWith(
      'This email address is already registered. Sign in with your password or use a different email.',
      'Registration failed'
    );
    const helpAction = fixture.nativeElement.querySelector('.field-help-action');
    expect(helpAction).toBeTruthy();
    expect(helpAction.textContent).toContain('Sign in instead');
    expect(fixture.nativeElement.querySelector('.auth-error-banner')).toBeNull();
  });

  it('should handle PHONE_TAKEN by displaying phone field error', () => {
    const errorResponse = new HttpErrorResponse({
      status: 409,
      error: { error: 'PHONE_TAKEN', message: 'Phone taken' }
    });
    authServiceSpy.register.and.returnValue(throwError(() => errorResponse));

    component.form.setValue({
      fullName: 'Commander Shepard',
      email: 'unique@citadel.com',
      phoneNumber: '0771234567',
      password: 'CitadelPassword123!',
      confirmPassword: 'CitadelPassword123!'
    });

    component.onSubmit();
    fixture.detectChanges();

    expect(component.phoneTaken()).toBeTrue();
    expect(toastServiceSpy.error).toHaveBeenCalledWith(
      'This phone number is already registered. Sign in with your password or use a different phone number.',
      'Registration failed'
    );
    expect(fixture.nativeElement.querySelector('.auth-error-banner')).toBeNull();
  });

  it('should map 400 VALIDATION_ERROR fieldErrors onto controls', () => {
    const errorResponse = new HttpErrorResponse({
      status: 400,
      error: {
        error: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        fieldErrors: {
          fullName: 'Name is invalid',
          password: 'Password must be at least 8 characters'
        }
      }
    });
    authServiceSpy.register.and.returnValue(throwError(() => errorResponse));

    component.form.setValue({
      fullName: 'Bad',
      email: 'ok@citadel.com',
      phoneNumber: '',
      password: 'ValidPassword123!',
      confirmPassword: 'ValidPassword123!'
    });

    component.onSubmit();
    fixture.detectChanges();

    expect(component.fullNameErrorMessage).toBe('Name is invalid');
    expect(component.passwordErrorMessage).toBe('Password must be at least 8 characters');
  });

  it('should render social buttons as disabled with "Coming soon"', () => {
    const socialBtns: HTMLButtonElement[] = fixture.nativeElement.querySelectorAll('.social-auth-btn');
    expect(socialBtns.length).toBe(2);
    expect(socialBtns[0].disabled).toBeTrue();
    expect(socialBtns[1].disabled).toBeTrue();
  });
});
