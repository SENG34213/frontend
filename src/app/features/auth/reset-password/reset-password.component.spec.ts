import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ResetPasswordComponent } from './reset-password.component';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { Router, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';

describe('ResetPasswordComponent', () => {
  let component: ResetPasswordComponent;
  let fixture: ComponentFixture<ResetPasswordComponent>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let toastServiceSpy: jasmine.SpyObj<ToastService>;
  let router: Router;

  beforeEach(async () => {
    history.replaceState({ identifier: 'soldier@gamingcastle.lk' }, '');
    sessionStorage.setItem('gc_reset_identifier', 'soldier@gamingcastle.lk');
    authServiceSpy = jasmine.createSpyObj('AuthService', ['resetPassword', 'forgotPassword']);
    toastServiceSpy = jasmine.createSpyObj('ToastService', ['success', 'info', 'error']);

    await TestBed.configureTestingModule({
      imports: [ResetPasswordComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authServiceSpy },
        { provide: ToastService, useValue: toastServiceSpy }
      ]
    }).compileComponents();

    router = TestBed.inject(Router);
    spyOn(router, 'navigate');

    fixture = TestBed.createComponent(ResetPasswordComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    history.replaceState(null, '');
    sessionStorage.clear();
    component.ngOnDestroy();
  });

  it('should create the reset password component', () => {
    expect(component).toBeTruthy();
  });

  it('should prefill and mask identifier from session storage', () => {
    expect(component.form.controls.identifier.value).toBe('soldier@gamingcastle.lk');
    expect(component.maskedIdentifier).toContain('@gamingcastle.lk');
    expect(component.maskedIdentifier.startsWith('s***@')).toBeTrue();
  });

  it('should validate 6-digit OTP code format', () => {
    const codeCtrl = component.form.controls.code;
    codeCtrl.setValue('');
    expect(codeCtrl.valid).toBeFalse();

    codeCtrl.setValue('12345');
    expect(codeCtrl.valid).toBeFalse();

    codeCtrl.setValue('123456');
    expect(codeCtrl.valid).toBeTrue();
  });

  it('should sync OTP inputs to code form control', () => {
    const event = { target: { value: '1' } } as unknown as Event;
    component.onOtpInput(event, 0);

    expect(component.otpDigits[0]).toBe('1');
    expect(component.form.controls.code.value).toBe('1');
  });

  it('should distribute pasted 6-digit code across cells', () => {
    const pasteEvent = {
      preventDefault: jasmine.createSpy('preventDefault'),
      clipboardData: { getData: () => '123456' }
    } as unknown as ClipboardEvent;

    component.onOtpPaste(pasteEvent);

    expect(pasteEvent.preventDefault).toHaveBeenCalled();
    expect(component.otpDigits).toEqual(['1', '2', '3', '4', '5', '6']);
    expect(component.form.controls.code.value).toBe('123456');
  });

  it('should validate password and confirm password matching', () => {
    component.form.controls.newPassword.setValue('NewPassword123!');
    component.form.controls.confirmPassword.setValue('WrongMatch!');
    component.form.controls.confirmPassword.markAsDirty();
    component.form.updateValueAndValidity();

    expect(component.form.hasError('passwordsMismatch')).toBeTrue();
    expect(component.confirmPasswordErrorMessage).toBe('Passwords do not match.');

    component.form.controls.confirmPassword.setValue('NewPassword123!');
    component.form.updateValueAndValidity();
    expect(component.form.hasError('passwordsMismatch')).toBeFalse();
  });

  it('should decrement cooldown timer and allow resend when zero', fakeAsync(() => {
    expect(component.resendCooldown()).toBe(60);

    tick(60000);
    expect(component.resendCooldown()).toBe(0);

    authServiceSpy.forgotPassword.and.returnValue(of(void 0));
    component.resendCode();

    expect(authServiceSpy.forgotPassword).toHaveBeenCalledWith('soldier@gamingcastle.lk');
    expect(toastServiceSpy.info).toHaveBeenCalled();
    expect(component.resendCooldown()).toBe(60);
  }));

  it('should submit reset request successfully and navigate to /login', () => {
    authServiceSpy.resetPassword.and.returnValue(of(void 0));

    component.form.setValue({
      identifier: 'soldier@gamingcastle.lk',
      code: '123456',
      newPassword: 'BrandNewPassword123!',
      confirmPassword: 'BrandNewPassword123!'
    });

    component.onSubmit();

    expect(authServiceSpy.resetPassword).toHaveBeenCalledWith({
      identifier: 'soldier@gamingcastle.lk',
      code: '123456',
      newPassword: 'BrandNewPassword123!'
    });
    expect(toastServiceSpy.success).toHaveBeenCalledWith('Password updated. Please sign in.', 'Password Updated');
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
    expect(sessionStorage.getItem('gc_reset_identifier')).toBeNull();
  });

  it('should handle INVALID_RESET_CODE error by setting a corrective inline message', () => {
    const errorResponse = new HttpErrorResponse({
      status: 400,
      error: { error: 'INVALID_RESET_CODE', message: 'Reset code expired' }
    });
    authServiceSpy.resetPassword.and.returnValue(throwError(() => errorResponse));

    component.form.setValue({
      identifier: 'soldier@gamingcastle.lk',
      code: '999999',
      newPassword: 'BrandNewPassword123!',
      confirmPassword: 'BrandNewPassword123!'
    });

    component.onSubmit();
    fixture.detectChanges();

    expect(component.form.controls.code.hasError('invalidCode')).toBeTrue();
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('That code is incorrect or has expired.');
    expect(text).toContain('You have up to 5 attempts');
  });

  it('should toggle password visibilities', () => {
    expect(component.showNewPassword()).toBeFalse();
    component.toggleNewPasswordVisibility();
    expect(component.showNewPassword()).toBeTrue();

    expect(component.showConfirmPassword()).toBeFalse();
    component.toggleConfirmPasswordVisibility();
    expect(component.showConfirmPassword()).toBeTrue();
  });
});
