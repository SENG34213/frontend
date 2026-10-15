import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export type PasswordStrength = 'weak' | 'fair' | 'strong';

/**
 * Calculates visual password strength score:
 * - 'weak': < 8 characters or only 1 character category
 * - 'fair': >= 8 characters with at least 2 character categories (lowercase, uppercase, digits, symbols)
 * - 'strong': >= 8 characters with at least 3 categories, or >= 12 characters with 2+ categories
 */
export function calculatePasswordStrength(password: string): PasswordStrength {
  if (!password || password.length < 8) {
    return 'weak';
  }

  let criteria = 0;
  if (/[a-z]/.test(password)) criteria++;
  if (/[A-Z]/.test(password)) criteria++;
  if (/[0-9]/.test(password)) criteria++;
  if (/[^a-zA-Z0-9]/.test(password)) criteria++;

  if (password.length >= 12 && criteria >= 2) {
    return 'strong';
  }

  if (criteria >= 3 && password.length >= 8) {
    return 'strong';
  }

  if (criteria >= 2) {
    return 'fair';
  }

  return 'weak';
}

/**
 * Validator ensuring the password meets minimum security standards (min 8 characters).
 */
export function strongPasswordValidator(minLength = 8): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const raw = control.value;
    if (raw === null || raw === undefined || raw === '') {
      return null;
    }

    const value = String(raw);
    if (value.length < minLength) {
      return {
        minlength: {
          requiredLength: minLength,
          actualLength: value.length,
          message: `Password must be at least ${minLength} characters.`
        }
      };
    }

    return null;
  };
}
