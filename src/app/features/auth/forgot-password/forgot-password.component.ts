import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ErrorMapper } from '../../../core/http/error-mapper';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { ApiError } from '../../../shared/models/api-response.model';
import { AuthShellComponent } from '../shared/auth-shell.component';
import { CardComponent } from '../../../shared/ui/card/card.component';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { InputComponent } from '../../../shared/ui/input/input.component';
import { emailOrPhoneValidator } from '../../../shared/validators';

const RESET_IDENTIFIER_STORAGE_KEY = 'gc_reset_identifier';

@Component({
  selector: 'app-forgot-password',
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
  templateUrl: './forgot-password.component.html',
  styleUrl: './forgot-password.component.scss'
})
export class ForgotPasswordComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toastService = inject(ToastService);

  readonly isSubmitting = signal<boolean>(false);
  readonly form = this.fb.group({
    identifier: ['', [Validators.required, emailOrPhoneValidator()]]
  });

  ngOnInit(): void {
    const navigationState = this.router.getCurrentNavigation()?.extras.state;
    const historyState = history.state as { identifier?: unknown } | null;
    const identifier = navigationState?.['identifier'] ?? historyState?.identifier;

    if (typeof identifier === 'string' && identifier.trim()) {
      this.identifierControl.setValue(identifier.trim());
    }
  }

  get identifierControl() {
    return this.form.controls.identifier;
  }

  get identifierErrorMessage(): string | null {
    const ctrl = this.identifierControl;
    if ((!ctrl.touched && !ctrl.dirty) || !ctrl.errors) return null;
    if (ctrl.errors['required']) {
      return 'Email address or phone number is required.';
    }
    if (ctrl.errors['emailOrPhone']) {
      return ctrl.errors['emailOrPhone'].message || 'Please enter a valid email or Sri Lankan phone number.';
    }
    return null;
  }

  private persistIdentifier(identifier: string): void {
    if (identifier) {
      sessionStorage.setItem(RESET_IDENTIFIER_STORAGE_KEY, identifier.trim());
    }
  }

  private navigateToReset(identifier: string): void {
    const cleanIdentifier = identifier.trim();
    this.persistIdentifier(cleanIdentifier);
    this.router.navigate(['/reset-password'], {
      state: { identifier: cleanIdentifier }
    });
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

    const cleanIdentifier = (this.identifierControl.value || '').trim();
    const neutralMessage = `If an account exists for ${cleanIdentifier}, a code is on its way. It expires in 15 minutes. Check your spam folder too.`;

    this.authService.forgotPassword(cleanIdentifier).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.toastService.info(neutralMessage);
        this.navigateToReset(cleanIdentifier);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        const mappedError = err?.status !== undefined && err?.message && err?.action
          ? (err as ApiError)
          : ErrorMapper.map(err);
        this.toastService.error(
          `${mappedError.message} ${mappedError.action}`,
          'Code request failed'
        );
        this.navigateToReset(cleanIdentifier);
      }
    });
  }
}
