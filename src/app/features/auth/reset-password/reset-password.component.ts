import { ChangeDetectorRef, Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { ErrorMapper } from '../../../core/http/error-mapper';
import { ApiError } from '../../../shared/models/api-response.model';
import { ResetPasswordRequest } from '../../../shared/models/auth.model';
import { AuthShellComponent } from '../shared/auth-shell.component';
import { CardComponent } from '../../../shared/ui/card/card.component';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { InputComponent } from '../../../shared/ui/input/input.component';
import {
  emailOrPhoneValidator,
  passwordsMatchValidator,
  strongPasswordValidator,
  calculatePasswordStrength,
  PasswordStrength
} from '../../../shared/validators';

const RESET_IDENTIFIER_STORAGE_KEY = 'gc_reset_identifier';

@Component({
  selector: 'app-reset-password',
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
  templateUrl: './reset-password.component.html',
  styleUrl: './reset-password.component.scss'
})
export class ResetPasswordComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toastService = inject(ToastService);

  readonly showNewPassword = signal<boolean>(false);
  readonly showConfirmPassword = signal<boolean>(false);
  readonly isSubmitting = signal<boolean>(false);
  readonly isResending = signal<boolean>(false);

  private readonly cdr = inject(ChangeDetectorRef);
  private cooldownDeadline = 0;
  readonly resendCooldown = (): number => {
    if (!this.cooldownDeadline) {
      return 0;
    }

    return Math.max(0, Math.ceil((this.cooldownDeadline - Date.now()) / 1000));
  };
  private cooldownTimer: ReturnType<typeof setInterval> | null = null;

  otpDigits: string[] = ['', '', '', '', '', ''];

  readonly form = this.fb.group(
    {
      identifier: ['', [Validators.required, emailOrPhoneValidator()]],
      code: ['', [Validators.required, Validators.pattern(/^[0-9]{6}$/)]],
      newPassword: ['', [Validators.required, strongPasswordValidator(8)]],
      confirmPassword: ['']
    },
    {
      validators: [passwordsMatchValidator('newPassword', 'confirmPassword')]
    }
  );

  ngOnInit(): void {
    const navigationIdentifier = this.router.getCurrentNavigation()?.extras.state?.['identifier'] as string | undefined;
    const historyIdentifier = (history.state as { identifier?: string } | undefined)?.identifier;
    const storedIdentifier = sessionStorage.getItem(RESET_IDENTIFIER_STORAGE_KEY) || '';
    const resolvedIdentifier = (navigationIdentifier || historyIdentifier || storedIdentifier).trim();

    if (!resolvedIdentifier) {
      this.router.navigate(['/forgot-password']);
      return;
    }

    this.form.controls.identifier.setValue(resolvedIdentifier);
    this.startCooldown();
  }

  ngOnDestroy(): void {
    this.stopCooldown();
  }

  get maskedIdentifier(): string {
    const raw = (this.form.controls.identifier.value || '').trim();
    if (!raw) return '';

    if (raw.includes('@')) {
      const [localPart, domain] = raw.split('@');
      if (!domain) return raw;
      const visible = localPart.charAt(0) || '';
      return visible ? `${visible}***@${domain}` : `***@${domain}`;
    }

    const digitsOnly = raw.replace(/\D/g, '');
    if (!digitsOnly) return raw;
    return `${'*'.repeat(6)}${digitsOnly.slice(-4)}`;
  }

  get passwordStrength(): PasswordStrength {
    const val = this.form.controls.newPassword.value || '';
    return calculatePasswordStrength(val);
  }

  get passwordStrengthLabel(): string {
    const val = this.form.controls.newPassword.value || '';
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

  get invalidCodeMessage(): string | null {
    if (this.form.controls.code.hasError('invalidCode')) {
      return 'That code is incorrect or has expired.';
    }
    return null;
  }

  get invalidCodeActionMessage(): string | null {
    if (this.form.controls.code.hasError('invalidCode')) {
      return 'You have up to 5 attempts before requesting a new code.';
    }
    return null;
  }

  get identifierErrorMessage(): string | null {
    const ctrl = this.form.controls.identifier;
    if ((!ctrl.touched && !ctrl.dirty) || !ctrl.errors) return null;
    if (ctrl.errors['required']) return 'Email address or phone number is required.';
    if (ctrl.errors['emailOrPhone']) {
      return ctrl.errors['emailOrPhone'].message || 'Please enter a valid email or Sri Lankan phone number.';
    }
    return null;
  }

  get codeErrorMessage(): string | null {
    const ctrl = this.form.controls.code;
    if ((!ctrl.touched && !ctrl.dirty) || !ctrl.errors) return null;
    if (ctrl.errors['required'] || ctrl.errors['pattern']) {
      return 'Please enter the complete 6-digit verification code.';
    }
    if (ctrl.errors['invalidCode']) {
      return 'That code is incorrect or has expired.';
    }
    return null;
  }

  get newPasswordErrorMessage(): string | null {
    const ctrl = this.form.controls.newPassword;
    if ((!ctrl.touched && !ctrl.dirty) || !ctrl.errors) return null;
    if (ctrl.errors['required']) return 'New password is required.';
    if (ctrl.errors['minlength']) {
      return ctrl.errors['minlength'].message || 'Password must be at least 8 characters.';
    }
    return null;
  }

  get confirmPasswordErrorMessage(): string | null {
    const ctrl = this.form.controls.confirmPassword;
    if ((!ctrl.touched && !ctrl.dirty) || !ctrl.errors) return null;
    if (ctrl.errors['passwordsMismatch']) return 'Passwords do not match.';
    return null;
  }

  onOtpInput(event: Event, index: number): void {
    const input = event.target as HTMLInputElement;
    const value = input.value.replace(/[^0-9]/g, '');

    if (value.length > 0) {
      this.otpDigits[index] = value.slice(-1);
      input.value = this.otpDigits[index];

      if (index < 5) {
        const nextInput = document.getElementById(`otp-input-${index + 1}`) as HTMLInputElement;
        nextInput?.focus();
      }
    } else {
      this.otpDigits[index] = '';
    }

    this.syncOtpCode();
  }

  onOtpKeyDown(event: KeyboardEvent, index: number): void {
    if (event.key === 'Backspace' && !this.otpDigits[index] && index > 0) {
      const prevInput = document.getElementById(`otp-input-${index - 1}`) as HTMLInputElement;
      prevInput?.focus();
    }
  }

  onOtpPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const pasted = event.clipboardData?.getData('text') || '';
    const cleanDigits = pasted.replace(/[^0-9]/g, '').slice(0, 6);

    for (let i = 0; i < 6; i++) {
      this.otpDigits[i] = cleanDigits[i] || '';
      const el = document.getElementById(`otp-input-${i}`) as HTMLInputElement;
      if (el) el.value = this.otpDigits[i];
    }

    this.syncOtpCode();

    const focusIdx = Math.min(cleanDigits.length, 5);
    const targetInput = document.getElementById(`otp-input-${focusIdx}`) as HTMLInputElement;
    targetInput?.focus();
  }

  private syncOtpCode(): void {
    const fullCode = this.otpDigits.join('');
    this.form.controls.code.setValue(fullCode);
    this.form.controls.code.markAsDirty();
  }

  toggleNewPasswordVisibility(): void {
    this.showNewPassword.update((val) => !val);
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword.update((val) => !val);
  }

  resendCode(): void {
    if (this.resendCooldown() > 0 || this.isResending()) return;

    const identifier = (this.form.controls.identifier.value || '').trim();
    if (!identifier) {
      this.form.controls.identifier.markAsTouched();
      return;
    }

    this.isResending.set(true);
    this.authService.forgotPassword(identifier).subscribe({
      next: () => {
        this.isResending.set(false);
        this.toastService.info('A new 6-digit code is on its way. It expires in 15 minutes. Check your spam folder too.');
        this.startCooldown();
      },
      error: (err) => {
        this.isResending.set(false);
        const mappedError = err?.status !== undefined && err?.message && err?.action
          ? (err as ApiError)
          : ErrorMapper.map(err);
        this.toastService.error(
          `${mappedError.message} ${mappedError.action}`,
          'Code request failed'
        );
        this.startCooldown();
      }
    });
  }

  private startCooldown(): void {
    this.stopCooldown();
    this.cooldownDeadline = Date.now() + 60000;
    this.cooldownTimer = setInterval(() => {
      const remaining = this.resendCooldown();
      if (remaining <= 0) {
        this.stopCooldown();
        return;
      }

      this.cdr.markForCheck();
    }, 1000);
  }

  private stopCooldown(): void {
    if (this.cooldownTimer) {
      clearInterval(this.cooldownTimer);
      this.cooldownTimer = null;
    }
    this.cooldownDeadline = 0;
  }

  onSubmit(): void {
    if (this.isSubmitting()) return;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    const val = this.form.getRawValue();
    const resetReq: ResetPasswordRequest = {
      identifier: (val.identifier || '').trim(),
      code: (val.code || '').trim(),
      newPassword: val.newPassword || ''
    };

    this.authService.resetPassword(resetReq).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        sessionStorage.removeItem(RESET_IDENTIFIER_STORAGE_KEY);
        this.toastService.success('Password updated. Please sign in.', 'Password Updated');
        this.router.navigate(['/login']);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        const mapped = err?.status !== undefined && err?.message && err?.action
          ? (err as ApiError)
          : ErrorMapper.map(err);

        this.toastService.error(
          `${mapped.message} ${mapped.action}`,
          'Password reset failed'
        );

        if (mapped.code === 'INVALID_RESET_CODE') {
          this.form.controls.code.setErrors({ invalidCode: true });
          this.form.controls.code.markAsTouched();
        }
      }
    });
  }
}
