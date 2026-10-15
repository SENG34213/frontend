import { FormControl, FormGroup } from '@angular/forms';
import {
  isEmail,
  isSriLankanPhone,
  emailOrPhoneValidator,
  sriLankanPhoneValidator
} from './email-or-phone.validator';
import { passwordsMatchValidator } from './passwords-match.validator';
import {
  calculatePasswordStrength,
  strongPasswordValidator
} from './strong-enough.validator';

describe('Shared Validators', () => {
  describe('email-or-phone.validator', () => {
    it('should correctly identify valid and invalid emails', () => {
      expect(isEmail('player@gamingcastle.lk')).toBeTrue();
      expect(isEmail('john.doe+tag@example.com')).toBeTrue();
      expect(isEmail('not-an-email')).toBeFalse();
      expect(isEmail('@missing-user.com')).toBeFalse();
      expect(isEmail('')).toBeFalse();
    });

    it('should correctly identify Sri Lankan mobile numbers', () => {
      expect(isSriLankanPhone('0771234567')).toBeTrue();
      expect(isSriLankanPhone('0712345678')).toBeTrue();
      expect(isSriLankanPhone('+94771234567')).toBeTrue();
      expect(isSriLankanPhone('077-123-4567')).toBeTrue();
      expect(isSriLankanPhone('078 987 6543')).toBeTrue();

      // Invalid mobile numbers
      expect(isSriLankanPhone('0112345678')).toBeFalse(); // Colombo landline, not mobile
      expect(isSriLankanPhone('077123')).toBeFalse(); // Too short
      expect(isSriLankanPhone('not-a-number')).toBeFalse();
      expect(isSriLankanPhone('')).toBeFalse();
    });

    it('should validate email or phone in FormControl', () => {
      const validator = emailOrPhoneValidator();

      // Empty values pass (left to Validators.required)
      expect(validator(new FormControl(''))).toBeNull();
      expect(validator(new FormControl(null))).toBeNull();

      // Valid email
      expect(validator(new FormControl('player@gamingcastle.lk'))).toBeNull();

      // Valid phone
      expect(validator(new FormControl('0771234567'))).toBeNull();
      expect(validator(new FormControl('+94771234567'))).toBeNull();

      // Invalid input
      const invalidResult = validator(new FormControl('invalid_input'));
      expect(invalidResult).not.toBeNull();
      expect(invalidResult?.['emailOrPhone']).toBeDefined();
    });

    it('should validate Sri Lankan phone in FormControl', () => {
      const validator = sriLankanPhoneValidator();

      expect(validator(new FormControl(''))).toBeNull();
      expect(validator(new FormControl('0771234567'))).toBeNull();

      const invalidResult = validator(new FormControl('test@example.com'));
      expect(invalidResult).not.toBeNull();
      expect(invalidResult?.['phone']).toBeDefined();
    });
  });

  describe('passwords-match.validator', () => {
    it('should return null when confirm password is empty', () => {
      const group = new FormGroup(
        {
          password: new FormControl('Secret123!'),
          confirmPassword: new FormControl('')
        },
        { validators: passwordsMatchValidator() }
      );

      expect(group.valid).toBeTrue();
      expect(group.get('confirmPassword')?.hasError('passwordsMismatch')).toBeFalse();
    });

    it('should return error when passwords do not match', () => {
      const group = new FormGroup(
        {
          password: new FormControl('Secret123!'),
          confirmPassword: new FormControl('DifferentPassword!')
        },
        { validators: passwordsMatchValidator() }
      );

      group.updateValueAndValidity();
      expect(group.hasError('passwordsMismatch')).toBeTrue();
      expect(group.get('confirmPassword')?.hasError('passwordsMismatch')).toBeTrue();
    });

    it('should pass and clear error when passwords match', () => {
      const group = new FormGroup(
        {
          password: new FormControl('Secret123!'),
          confirmPassword: new FormControl('Secret123!')
        },
        { validators: passwordsMatchValidator() }
      );

      group.updateValueAndValidity();
      expect(group.valid).toBeTrue();
      expect(group.get('confirmPassword')?.hasError('passwordsMismatch')).toBeFalse();
    });
  });

  describe('strong-enough.validator', () => {
    it('should calculate password strength correctly', () => {
      expect(calculatePasswordStrength('')).toBe('weak');
      expect(calculatePasswordStrength('short')).toBe('weak');
      expect(calculatePasswordStrength('12345678')).toBe('weak');
      expect(calculatePasswordStrength('password123')).toBe('fair');
      expect(calculatePasswordStrength('GamingCastle2026!')).toBe('strong');
    });

    it('should validate minimum password length', () => {
      const validator = strongPasswordValidator(8);

      expect(validator(new FormControl(''))).toBeNull(); // Empty handled by required
      expect(validator(new FormControl('short'))).toEqual(
        jasmine.objectContaining({
          minlength: jasmine.objectContaining({
            requiredLength: 8,
            actualLength: 5
          })
        })
      );
      expect(validator(new FormControl('validlength123'))).toBeNull();
    });
  });
});
