import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Cross-field validator for FormGroups to ensure two password fields match.
 * Automatically sets/clears the `passwordsMismatch` error on the confirmPassword control.
 */
export function passwordsMatchValidator(
  passwordField = 'password',
  confirmPasswordField = 'confirmPassword'
): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const passwordCtrl = control.get(passwordField);
    const confirmPasswordCtrl = control.get(confirmPasswordField);

    if (!passwordCtrl || !confirmPasswordCtrl) {
      return null;
    }

    // Do not validate mismatch until confirm password has a value
    if (!confirmPasswordCtrl.value) {
      if (confirmPasswordCtrl.hasError('passwordsMismatch')) {
        const errors = { ...confirmPasswordCtrl.errors };
        delete errors['passwordsMismatch'];
        confirmPasswordCtrl.setErrors(Object.keys(errors).length ? errors : null);
      }
      return null;
    }

    if (passwordCtrl.value !== confirmPasswordCtrl.value) {
      const currentErrors = confirmPasswordCtrl.errors || {};
      confirmPasswordCtrl.setErrors({ ...currentErrors, passwordsMismatch: true });
      return { passwordsMismatch: true };
    } else {
      if (confirmPasswordCtrl.hasError('passwordsMismatch')) {
        const errors = { ...confirmPasswordCtrl.errors };
        delete errors['passwordsMismatch'];
        confirmPasswordCtrl.setErrors(Object.keys(errors).length ? errors : null);
      }
      return null;
    }
  };
}
