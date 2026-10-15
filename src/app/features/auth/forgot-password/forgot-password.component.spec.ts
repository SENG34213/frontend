import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ForgotPasswordComponent } from './forgot-password.component';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { Router, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

describe('ForgotPasswordComponent', () => {
  let component: ForgotPasswordComponent;
  let fixture: ComponentFixture<ForgotPasswordComponent>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let toastServiceSpy: jasmine.SpyObj<ToastService>;
  let router: Router;

  const expectedMessage = 'If an account exists for player@gamingcastle.lk, a code is on its way. It expires in 15 minutes. Check your spam folder too.';

  beforeEach(async () => {
    sessionStorage.clear();
    history.replaceState(null, '');
    authServiceSpy = jasmine.createSpyObj('AuthService', ['forgotPassword']);
    toastServiceSpy = jasmine.createSpyObj('ToastService', ['info']);

    await TestBed.configureTestingModule({
      imports: [ForgotPasswordComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authServiceSpy },
        { provide: ToastService, useValue: toastServiceSpy }
      ]
    }).compileComponents();

    router = TestBed.inject(Router);
    spyOn(router, 'navigate');

    fixture = TestBed.createComponent(ForgotPasswordComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the forgot password component', () => {
    expect(component).toBeTruthy();
  });

  it('should prefill the editable identifier from router history state for an email without sending a code', () => {
    history.replaceState({ identifier: 'player@gamingcastle.lk' }, '');
    component.ngOnInit();

    expect(component.identifierControl.value).toBe('player@gamingcastle.lk');
    expect(component.identifierControl.enabled).toBeTrue();
    expect(authServiceSpy.forgotPassword).not.toHaveBeenCalled();
  });

  it('should prefill the editable identifier from router history state for a phone without sending a code', () => {
    history.replaceState({ identifier: '0771234567' }, '');
    component.ngOnInit();

    expect(component.identifierControl.value).toBe('0771234567');
    expect(component.identifierControl.enabled).toBeTrue();
    expect(authServiceSpy.forgotPassword).not.toHaveBeenCalled();
  });

  it('should leave the identifier empty when router state does not contain a value', () => {
    history.replaceState(null, '');
    component.ngOnInit();

    expect(component.identifierControl.value).toBe('');
    expect(authServiceSpy.forgotPassword).not.toHaveBeenCalled();
  });

  it('should validate identifier field for email or phone', () => {
    const ctrl = component.identifierControl;

    ctrl.setValue('');
    expect(ctrl.valid).toBeFalse();

    ctrl.setValue('invalid-id');
    expect(ctrl.valid).toBeFalse();

    ctrl.setValue('player@gamingcastle.lk');
    expect(ctrl.valid).toBeTrue();

    ctrl.setValue('0771234567');
    expect(ctrl.valid).toBeTrue();
  });

  it('should not call authService on submit if form is invalid', () => {
    component.onSubmit();
    expect(authServiceSpy.forgotPassword).not.toHaveBeenCalled();
    expect(component.identifierControl.touched).toBeTrue();
  });

  it('should submit recovery request, show neutral toast, and persist the identifier for reset', () => {
    authServiceSpy.forgotPassword.and.returnValue(of(void 0));

    component.identifierControl.setValue('player@gamingcastle.lk');
    component.onSubmit();

    expect(authServiceSpy.forgotPassword).toHaveBeenCalledWith('player@gamingcastle.lk');
    expect(toastServiceSpy.info).toHaveBeenCalledWith(expectedMessage);
    expect(router.navigate).toHaveBeenCalledWith(['/reset-password'], {
      state: { identifier: 'player@gamingcastle.lk' }
    });
    expect(sessionStorage.getItem('gc_reset_identifier')).toBe('player@gamingcastle.lk');
    expect(component.isSubmitting()).toBeFalse();
  });

  it('should prevent double submission when isSubmitting is true', () => {
    component.identifierControl.setValue('player@gamingcastle.lk');
    authServiceSpy.forgotPassword.and.returnValue(of(void 0));
    component.isSubmitting.set(true);

    component.onSubmit();

    expect(authServiceSpy.forgotPassword).not.toHaveBeenCalled();
  });

  it('should still show the neutral message and navigate even when forgotPassword fails', () => {
    authServiceSpy.forgotPassword.and.returnValue(throwError(() => new Error('network')));

    component.identifierControl.setValue('0771234567');
    component.onSubmit();

    expect(toastServiceSpy.info).toHaveBeenCalledWith('If an account exists for 0771234567, a code is on its way. It expires in 15 minutes. Check your spam folder too.');
    expect(router.navigate).toHaveBeenCalledWith(['/reset-password'], {
      state: { identifier: '0771234567' }
    });
    expect(sessionStorage.getItem('gc_reset_identifier')).toBe('0771234567');
  });
});
