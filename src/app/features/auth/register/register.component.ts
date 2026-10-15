import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ErrorMapper } from '../../../core/http/error-mapper';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { ApiError } from '../../../shared/models/api-response.model';
import { RegisterRequest } from '../../../shared/models/auth.model';
import { AuthShellComponent } from '../shared/auth-shell.component';
import { CardComponent } from '../../../shared/ui/card/card.component';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { InputComponent } from '../../../shared/ui/input/input.component';
import {
  sriLankanPhoneValidator,
  passwordsMatchValidator,
  strongPasswordValidator,
  calculatePasswordStrength,
  PasswordStrength
} from '../../../shared/validators';

@Component({
  selector: 'app-register',
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
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss'
})
export class RegisterComponent {
  private readonly fb = inject(FormBuilder);
  readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toastService = inject(ToastService);

  readonly showPassword = signal<boolean>(false);
  readonly showConfirmPassword = signal<boolean>(false);
  readonly isSubmitting = signal<boolean>(false);
  readonly apiError = signal<ApiError | null>(null);
  readonly emailTaken = signal<boolean>(false);
  readonly phoneTaken = signal<boolean>(false);

  readonly form = this.fb.group(
    {
      fullName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      phoneNumber: ['', [sriLankanPhoneValidator()]],
      password: ['', [Validators.required, strongPasswordValidator(8)]],
      confirmPassword: ['']
    },
    {
      validators: [passwordsMatchValidator('password', 'confirmPassword')]
    }
  );

  get passwordStrength(): PasswordStrength {
    const val = this.form.controls.password.value || '';
    return calculatePasswordStrength(val);
  }

  get passwordStrengthLabel(): string {
    const val = this.form.controls.password.value || '';
    if (!val) return '';
    switch (this.passwordStrength) {
      case 'strong':
        return 'Strong password';
      case 'fair':
        return 'Fair password';
      case 'weak':
      default:
        return 'Weak password (minimum 8 characters)';
    }
  }

  get fullNameErrorMessage(): string | null {
    const ctrl = this.form.controls.fullName;
    if (!ctrl.touched || !ctrl.errors) return null;
    if (ctrl.errors['required']) return 'Full name is required.';
    if (ctrl.errors['minlength']) return 'Name must be at least 2 characters.';
    if (ctrl.errors['serverError']) return ctrl.errors['serverError'];
    return null;
  }

  get emailErrorMessage(): string | null {
    if (this.emailTaken()) {
      return 'This email address is already registered.';
    }
    const ctrl = this.form.controls.email;
    if ((!ctrl.touched && !ctrl.dirty) || !ctrl.errors) return null;
    if (ctrl.errors['emailTaken']) {
      return 'This email address is already registered.';
    }
    if (ctrl.errors['required']) return 'Email address is required.';
    if (ctrl.errors['email']) return 'Please enter a valid email address.';
    if (ctrl.errors['serverError']) return ctrl.errors['serverError'];
    return null;
  }

  get phoneErrorMessage(): string | null {
    if (this.phoneTaken()) {
      return 'This phone number is already registered.';
    }
    const ctrl = this.form.controls.phoneNumber;
    if ((!ctrl.touched && !ctrl.dirty) || !ctrl.errors) return null;
    if (ctrl.errors['phoneTaken']) {
      return 'This phone number is already registered.';
    }
    if (ctrl.errors['phone']) {
      return ctrl.errors['phone'].message || 'Please enter a valid Sri Lankan phone number.';
    }
    if (ctrl.errors['serverError']) return ctrl.errors['serverError'];
    return null;
  }

  get passwordErrorMessage(): string | null {
    const ctrl = this.form.controls.password;
    if ((!ctrl.touched && !ctrl.dirty) || !ctrl.errors) return null;
    if (ctrl.errors['required']) return 'Password is required.';
    if (ctrl.errors['minlength']) {
      return ctrl.errors['minlength'].message || 'Password must be at least 8 characters.';
    }
    if (ctrl.errors['serverError']) return ctrl.errors['serverError'];
    return null;
  }

  get confirmPasswordErrorMessage(): string | null {
    const ctrl = this.form.controls.confirmPassword;
    if ((!ctrl.touched && !ctrl.dirty) || !ctrl.errors) return null;
    if (ctrl.errors['passwordsMismatch']) return 'Passwords do not match.';
    return null;
  }

  togglePasswordVisibility(): void {
    this.showPassword.update((val) => !val);
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword.update((val) => !val);
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
    this.apiError.set(null);
    this.emailTaken.set(false);
    this.phoneTaken.set(false);

    const val = this.form.getRawValue();
    const registerReq: RegisterRequest = {
      fullName: (val.fullName || '').trim(),
      email: (val.email || '').trim().toLowerCase(),
      phoneNumber: val.phoneNumber?.trim() ? val.phoneNumber.trim() : undefined,
      password: val.password || ''
    };

    this.authService.register(registerReq).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.toastService.success(
          'Soldier account created successfully! Welcome to Gaming Castle.',
          'Account Created'
        );
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        const mappedError = err?.status !== undefined && err?.message && err?.action
          ? (err as ApiError)
          : ErrorMapper.map(err);

        this.apiError.set(mappedError);

        if (mappedError.code === 'EMAIL_TAKEN') {
          this.emailTaken.set(true);
          this.form.controls.email.setErrors({ emailTaken: true });
        } else if (mappedError.code === 'PHONE_TAKEN') {
          this.phoneTaken.set(true);
          this.form.controls.phoneNumber.setErrors({ phoneTaken: true });
        }

        // Map field errors from 400 VALIDATION_ERROR onto individual controls
        if (mappedError.fieldErrors) {
          Object.entries(mappedError.fieldErrors).forEach(([field, msg]) => {
            const ctrl = this.form.get(field);
            if (ctrl) {
              ctrl.setErrors({ serverError: msg });
              ctrl.markAsTouched();
            }
          });
        }
      }
    });
  }
}
