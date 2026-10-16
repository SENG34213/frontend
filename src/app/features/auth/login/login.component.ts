import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ErrorMapper } from '../../../core/http/error-mapper';
import { ApiError } from '../../../shared/models/api-response.model';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { AuthShellComponent } from '../shared/auth-shell.component';
import { CardComponent } from '../../../shared/ui/card/card.component';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { InputComponent } from '../../../shared/ui/input/input.component';
import { sriLankanPhoneValidator } from '../../../shared/validators';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    AuthShellComponent,
    CardComponent,
    ButtonComponent,
    InputComponent
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly isPhoneMode = signal<boolean>(false);
  readonly showPassword = signal<boolean>(false);
  readonly isSubmitting = signal<boolean>(false);
  private readonly toastService = inject(ToastService);

  readonly form = this.fb.group({
    identifier: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]]
  });

  get identifierControl() {
    return this.form.controls.identifier;
  }

  get passwordControl() {
    return this.form.controls.password;
  }

  get forgotPasswordNavigationState(): { identifier?: string } {
    const identifier = (this.identifierControl.value || '').trim();
    if (!identifier || this.identifierControl.invalid) {
      return {};
    }

    return { identifier };
  }

  get identifierErrorMessage(): string | null {
    const ctrl = this.identifierControl;
    if (!ctrl.touched || !ctrl.errors) return null;
    if (ctrl.errors['required']) {
      return this.isPhoneMode() ? 'Phone number is required.' : 'Email address is required.';
    }
    if (ctrl.errors['email']) {
      return 'Please enter a valid email address.';
    }
    if (ctrl.errors['phone']) {
      return ctrl.errors['phone'].message || 'Please enter a valid Sri Lankan phone number.';
    }
    return 'Invalid identifier.';
  }

  get passwordErrorMessage(): string | null {
    const ctrl = this.passwordControl;
    if (!ctrl.touched || !ctrl.errors) return null;
    if (ctrl.errors['required']) {
      return 'Password is required.';
    }
    return null;
  }

  togglePhoneMode(): void {
    const nextMode = !this.isPhoneMode();
    this.isPhoneMode.set(nextMode);
    this.identifierControl.reset('');
    if (nextMode) {
      this.identifierControl.setValidators([Validators.required, sriLankanPhoneValidator()]);
    } else {
      this.identifierControl.setValidators([Validators.required, Validators.email]);
    }
    this.identifierControl.updateValueAndValidity();
  }

  togglePasswordVisibility(): void {
    this.showPassword.update((val) => !val);
  }

  onSubmit(): void {
    if (this.isSubmitting()) {
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    const { identifier, password } = this.form.getRawValue();
    const cleanId = (identifier || '').trim();
    const cleanPassword = password || '';

    const login$ = this.isPhoneMode()
      ? this.authService.phoneLogin({ phoneNumber: cleanId, password: cleanPassword })
      : this.authService.login({ email: cleanId, password: cleanPassword });

    login$.subscribe({
      next: () => {
        this.isSubmitting.set(false);
        const returnUrl =
          this.route.snapshot.queryParamMap.get('returnUrl') ||
          this.route.snapshot.queryParams['returnUrl'];

        if (returnUrl) {
          this.router.navigateByUrl(returnUrl);
        } else if (this.authService.isAdmin()) {
          this.router.navigate(['/admin']);
        } else {
          this.router.navigate(['/dashboard']);
        }
      },
      error: (err) => {
        this.isSubmitting.set(false);
        const mappedError = err?.status !== undefined && err?.message && err?.action
          ? (err as ApiError)
          : ErrorMapper.map(err);
        const accountLockedAction = mappedError.code === 'ACCOUNT_LOCKED'
          ? ' Use Forgot password to reset your password.'
          : '';
        this.toastService.error(
          `${mappedError.message} ${mappedError.action}${accountLockedAction}`,
          'Sign in failed'
        );
      }
    });
  }
}
