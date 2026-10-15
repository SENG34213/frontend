import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const SL_PHONE_REGEX = /^(?:\+94|0094|94|0)?7[0-9]{8}$/;

/**
 * Checks whether a trimmed string matches a standard email format.
 */
export function isEmail(value: string): boolean {
  if (!value) return false;
  return EMAIL_REGEX.test(value.trim());
}

/**
 * Checks whether a trimmed string matches a Sri Lankan mobile number format:
 * - 07XXXXXXXX (10 digits)
 * - +947XXXXXXXX
 * - 947XXXXXXXX
 */
export function isSriLankanPhone(value: string): boolean {
  if (!value) return false;
  const cleaned = value.trim().replace(/[\s\-()]/g, '');
  return SL_PHONE_REGEX.test(cleaned);
}

/**
 * Reactive form validator for an identifier that can be either an email address
 * or a Sri Lankan mobile phone number.
 */
export function emailOrPhoneValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const raw = control.value;
    if (raw === null || raw === undefined || raw === '') {
      return null;
    }

    const value = String(raw).trim();
    if (value === '') {
      return null;
    }

    if (isEmail(value) || isSriLankanPhone(value)) {
      return null;
    }

    return {
      emailOrPhone: {
        message: 'Please enter a valid email address or Sri Lankan mobile number (e.g. 0771234567).'
      }
    };
  };
}

/**
 * Reactive form validator for Sri Lankan mobile phone numbers specifically.
 */
export function sriLankanPhoneValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const raw = control.value;
    if (raw === null || raw === undefined || raw === '') {
      return null;
    }

    const value = String(raw).trim();
    if (value === '') {
      return null;
    }

    if (isSriLankanPhone(value)) {
      return null;
    }

    return {
      phone: {
        message: 'Please enter a valid Sri Lankan mobile number (e.g. 0771234567 or +94771234567).'
      }
    };
  };
}
