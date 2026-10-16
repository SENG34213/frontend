import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { LoginComponent } from './login.component';
import { AuthService } from '../../../core/services/auth.service';
import { Router, ActivatedRoute, RouterLink, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthResponse } from '../../../shared/models/auth.model';
import { ToastService } from '../../../shared/ui/toast/toast.service';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let toastServiceSpy: jasmine.SpyObj<ToastService>;
  let router: Router;
  let routeSnapshotStub: { queryParamMap: { get: jasmine.Spy }; queryParams: Record<string, string> };

  beforeEach(async () => {
    authServiceSpy = jasmine.createSpyObj('AuthService', ['login', 'phoneLogin', 'isAdmin'], {
      isAuthenticated: jasmine.createSpy('isAuthenticated').and.returnValue(false)
    });
    authServiceSpy.isAdmin.and.returnValue(false);
    toastServiceSpy = jasmine.createSpyObj('ToastService', ['error']);

    routeSnapshotStub = {
      queryParamMap: { get: jasmine.createSpy('get').and.returnValue(null) },
      queryParams: {}
    };

    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authServiceSpy },
        { provide: ToastService, useValue: toastServiceSpy },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: routeSnapshotStub }
        }
      ]
    }).compileComponents();

    router = TestBed.inject(Router);
    spyOn(router, 'navigate');
    spyOn(router, 'navigateByUrl');

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the login component', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with invalid empty form and email mode by default', () => {
    expect(component.form.valid).toBeFalse();
    expect(component.isPhoneMode()).toBeFalse();
  });

  it('should toggle between email and phone login modes', () => {
    expect(component.isPhoneMode()).toBeFalse();

    component.togglePhoneMode();
    expect(component.isPhoneMode()).toBeTrue();

    // In phone mode, 0771234567 should be valid
    component.form.controls.identifier.setValue('0771234567');
    expect(component.form.controls.identifier.valid).toBeTrue();

    // Invalid phone
    component.form.controls.identifier.setValue('invalid-phone');
    expect(component.form.controls.identifier.valid).toBeFalse();

    // Toggle back to email mode
    component.togglePhoneMode();
    expect(component.isPhoneMode()).toBeFalse();
    component.form.controls.identifier.setValue('player@gamingcastle.lk');
    expect(component.form.controls.identifier.valid).toBeTrue();
  });

  it('should toggle password visibility between password and text', () => {
    expect(component.showPassword()).toBeFalse();
    component.togglePasswordVisibility();
    expect(component.showPassword()).toBeTrue();
    component.togglePasswordVisibility();
    expect(component.showPassword()).toBeFalse();
  });

  it('should pass a valid email to forgot-password state without passing the password', () => {
    component.form.controls.identifier.setValue('player@gamingcastle.lk');
    component.passwordControl.setValue('secret-password');
    fixture.detectChanges();

    const link = fixture.debugElement.query(By.css('.forgot-password-row a')).injector.get(RouterLink);
    expect(link.state).toEqual({ identifier: 'player@gamingcastle.lk' });
    expect(link.state).not.toEqual(jasmine.objectContaining({ password: jasmine.anything() }));
  });

  it('should pass a valid phone number to forgot-password state in phone mode', () => {
    component.togglePhoneMode();
    component.identifierControl.setValue('0771234567');
    fixture.detectChanges();

    const link = fixture.debugElement.query(By.css('.forgot-password-row a')).injector.get(RouterLink);
    expect(link.state).toEqual({ identifier: '0771234567' });
  });

  it('should pass no identifier when the login field is empty or invalid', () => {
    const link = fixture.debugElement.query(By.css('.forgot-password-row a')).injector.get(RouterLink);

    expect(link.state).toEqual({});

    component.identifierControl.setValue('not-an-email');
    fixture.detectChanges();
    expect(link.state).toEqual({});
  });

  it('should not call authService if form is invalid on submit', () => {
    component.onSubmit();
    expect(authServiceSpy.login).not.toHaveBeenCalled();
    expect(authServiceSpy.phoneLogin).not.toHaveBeenCalled();
    expect(component.form.touched).toBeTrue();
  });

  it('should login via email and navigate to /dashboard for customers', () => {
    authServiceSpy.login.and.returnValue(
      of({
        accessToken: 'mock-token',
        tokenType: 'Bearer',
        userId: 'u1',
        email: 'soldier@gamingcastle.lk',
        role: 'CUSTOMER'
      })
    );

    component.form.setValue({
      identifier: 'soldier@gamingcastle.lk',
      password: 'password123'
    });

    component.onSubmit();

    expect(authServiceSpy.login).toHaveBeenCalledWith({
      email: 'soldier@gamingcastle.lk',
      password: 'password123'
    });
    expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);
    expect(component.isSubmitting()).toBeFalse();
  });

  it('should navigate to /admin for admin users upon login', () => {
    authServiceSpy.isAdmin.and.returnValue(true);
    authServiceSpy.login.and.returnValue(
      of({
        accessToken: 'admin-token',
        tokenType: 'Bearer',
        userId: 'admin1',
        email: 'admin@gamingcastle.lk',
        role: 'ADMIN'
      })
    );

    component.form.setValue({
      identifier: 'admin@gamingcastle.lk',
      password: 'adminPassword123'
    });

    component.onSubmit();

    expect(router.navigate).toHaveBeenCalledWith(['/admin']);
  });

  it('should honour returnUrl query parameter upon successful login', () => {
    routeSnapshotStub.queryParamMap.get.and.returnValue('/booking/new');
    authServiceSpy.login.and.returnValue(
      of({
        accessToken: 'mock-token',
        tokenType: 'Bearer',
        userId: 'u1',
        email: 'soldier@gamingcastle.lk',
        role: 'CUSTOMER'
      })
    );

    component.form.setValue({
      identifier: 'soldier@gamingcastle.lk',
      password: 'password123'
    });

    component.onSubmit();

    expect(router.navigateByUrl).toHaveBeenCalledWith('/booking/new');
  });

  it('should login via phone number in phone mode', () => {
    authServiceSpy.phoneLogin.and.returnValue(
      of({
        accessToken: 'mock-token',
        tokenType: 'Bearer',
        userId: 'u2',
        email: 'soldier@gamingcastle.lk',
        role: 'CUSTOMER'
      })
    );

    component.togglePhoneMode();
    component.form.setValue({
      identifier: '0771234567',
      password: 'password123'
    });

    component.onSubmit();

    expect(authServiceSpy.phoneLogin).toHaveBeenCalledWith({
      phoneNumber: '0771234567',
      password: 'password123'
    });
    expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);
  });

  it('should prevent double submission when isSubmitting is true', () => {
    component.form.setValue({
      identifier: 'soldier@gamingcastle.lk',
      password: 'password123'
    });

    const mockAuthResponse: AuthResponse = {
      accessToken: 'mock-token',
      tokenType: 'Bearer',
      userId: 'u1',
      email: 'soldier@gamingcastle.lk',
      role: 'CUSTOMER'
    };
    authServiceSpy.login.and.returnValue(of(mockAuthResponse));
    component.isSubmitting.set(true);

    component.onSubmit();

    expect(authServiceSpy.login).not.toHaveBeenCalled();
  });

  it('should show INVALID_CREDENTIALS in an error toast without an inline banner', () => {
    const errorResponse = new HttpErrorResponse({
      status: 401,
      error: { error: 'INVALID_CREDENTIALS', message: 'Bad credentials' }
    });
    authServiceSpy.login.and.returnValue(throwError(() => errorResponse));

    component.form.setValue({
      identifier: 'soldier@gamingcastle.lk',
      password: 'wrongPassword'
    });

    component.onSubmit();
    fixture.detectChanges();

    expect(toastServiceSpy.error).toHaveBeenCalledWith(
      'The email/phone or password you entered is incorrect. Please check your details and try again, or reset your password.',
      'Sign in failed'
    );
    expect(fixture.nativeElement.querySelector('.auth-error-banner')).toBeNull();
  });

  it('should include Forgot password guidance in the ACCOUNT_LOCKED toast', () => {
    const errorResponse = new HttpErrorResponse({
      status: 423,
      error: { error: 'ACCOUNT_LOCKED', message: 'Account is locked' }
    });
    authServiceSpy.login.and.returnValue(throwError(() => errorResponse));

    component.form.setValue({
      identifier: 'soldier@gamingcastle.lk',
      password: 'wrongPassword'
    });

    component.onSubmit();
    fixture.detectChanges();

    expect(toastServiceSpy.error).toHaveBeenCalledWith(
      'This account has been temporarily locked due to too many failed login attempts. Please wait 15 minutes before trying again, or reset your password. Use Forgot password to reset your password.',
      'Sign in failed'
    );
    expect(fixture.nativeElement.querySelector('.auth-error-banner')).toBeNull();
  });

  it('should show ACCOUNT_DEACTIVATED in an error toast without an inline banner', () => {
    const errorResponse = new HttpErrorResponse({
      status: 403,
      error: { error: 'ACCOUNT_DEACTIVATED', message: 'Account deactivated' }
    });
    authServiceSpy.login.and.returnValue(throwError(() => errorResponse));
    component.form.setValue({
      identifier: 'soldier@gamingcastle.lk',
      password: 'wrongPassword'
    });

    component.onSubmit();
    fixture.detectChanges();

    expect(toastServiceSpy.error).toHaveBeenCalledWith(
      'This account has been deactivated. You can reactivate your account by requesting a reactivation code.',
      'Sign in failed'
    );
    expect(fixture.nativeElement.querySelector('.auth-error-banner')).toBeNull();
  });

  it('should show server and network errors in error toasts without inline banners', () => {
    const failures = [
      {
        error: new HttpErrorResponse({ status: 503, error: { message: 'Unavailable' } }),
        message: 'The Gaming Castle server encountered a temporary issue. Our team has been notified. Please try again in 1–2 minutes.'
      },
      {
        error: new HttpErrorResponse({ status: 0, statusText: 'Unknown Error' }),
        message: 'Unable to connect to the Gaming Castle server. Please check your internet connection or verify the server is running.'
      }
    ];

    failures.forEach(({ error, message }) => {
      authServiceSpy.login.and.returnValue(throwError(() => error));
      component.form.setValue({
        identifier: 'soldier@gamingcastle.lk',
        password: 'wrongPassword'
      });

      component.onSubmit();
      fixture.detectChanges();

      expect(toastServiceSpy.error).toHaveBeenCalledWith(message, 'Sign in failed');
      expect(fixture.nativeElement.querySelector('.auth-error-banner')).toBeNull();
    });
  });

  it('should render social buttons as disabled', () => {
    const socialBtns: HTMLButtonElement[] = fixture.nativeElement.querySelectorAll('.social-auth-btn');
    expect(socialBtns.length).toBe(2);
    expect(socialBtns[0].disabled).toBeTrue();
    expect(socialBtns[1].disabled).toBeTrue();
    expect(socialBtns[1].textContent).toContain('Continue with Facebook');
  });
});
