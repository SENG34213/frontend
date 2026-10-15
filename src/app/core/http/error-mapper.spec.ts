import { HttpErrorResponse } from '@angular/common/http';
import { ErrorMapper } from './error-mapper';

describe('ErrorMapper', () => {
  it('should map unknown error to generic message with corrective action', () => {
    const error = ErrorMapper.map(new Error('Unknown crash'));
    expect(error.status).toBe(0);
    expect(error.message).toContain('unexpected application error');
    expect(error.action).toBeTruthy();
  });

  it('should map status 0 to connection error', () => {
    const httpErr = new HttpErrorResponse({ status: 0, statusText: 'Unknown Error' });
    const error = ErrorMapper.map(httpErr);
    expect(error.status).toBe(0);
    expect(error.message).toContain('Unable to connect');
    expect(error.action).toContain('check your internet connection');
  });

  it('should map status 400 with field errors', () => {
    const httpErr = new HttpErrorResponse({
      status: 400,
      error: {
        message: 'Invalid input data',
        fieldErrors: { email: 'Email is required' }
      }
    });
    const error = ErrorMapper.map(httpErr);
    expect(error.status).toBe(400);
    expect(error.message).toBe('Invalid input data');
    expect(error.fieldErrors?.['email']).toBe('Email is required');
  });

  it('should map status 401 session expired', () => {
    const httpErr = new HttpErrorResponse({ status: 401 });
    const error = ErrorMapper.map(httpErr);
    expect(error.status).toBe(401);
    expect(error.message).toContain('session has expired');
    expect(error.action).toContain('sign in');
  });

  it('should map status 403 forbidden', () => {
    const httpErr = new HttpErrorResponse({ status: 403 });
    const error = ErrorMapper.map(httpErr);
    expect(error.status).toBe(403);
    expect(error.message).toContain('do not have permission');
  });

  it('should map status 404 not found', () => {
    const httpErr = new HttpErrorResponse({ status: 404 });
    const error = ErrorMapper.map(httpErr);
    expect(error.status).toBe(404);
    expect(error.message).toContain('could not be found');
  });

  it('should map status 409 slot unavailable conflict with plain-English advice', () => {
    const httpErr = new HttpErrorResponse({
      status: 409,
      error: { message: 'SLOT_UNAVAILABLE' }
    });
    const error = ErrorMapper.map(httpErr);
    expect(error.status).toBe(409);
    expect(error.message).toContain('That slot was just taken');
    expect(error.action).toContain('pick another available time slot');
  });

  it('should map status 500 server error', () => {
    const httpErr = new HttpErrorResponse({ status: 500 });
    const error = ErrorMapper.map(httpErr);
    expect(error.status).toBe(500);
    expect(error.message).toContain('server encountered a temporary issue');
  });

  describe('backend error codes', () => {
    it('should map EMAIL_TAKEN with helpful corrective action', () => {
      const httpErr = new HttpErrorResponse({
        status: 409,
        error: { error: 'EMAIL_TAKEN', message: 'Email already exists' }
      });
      const error = ErrorMapper.map(httpErr);
      expect(error.code).toBe('EMAIL_TAKEN');
      expect(error.status).toBe(409);
      expect(error.message).toContain('email address is already registered');
      expect(error.action).toContain('Sign in');
    });

    it('should map PHONE_TAKEN with helpful corrective action', () => {
      const httpErr = new HttpErrorResponse({
        status: 409,
        error: { error: 'PHONE_TAKEN', message: 'Phone already exists' }
      });
      const error = ErrorMapper.map(httpErr);
      expect(error.code).toBe('PHONE_TAKEN');
      expect(error.status).toBe(409);
      expect(error.message).toContain('phone number is already registered');
      expect(error.action).toContain('Sign in');
    });

    it('should map INVALID_CREDENTIALS', () => {
      const httpErr = new HttpErrorResponse({
        status: 401,
        error: { error: 'INVALID_CREDENTIALS', message: 'Bad credentials' }
      });
      const error = ErrorMapper.map(httpErr);
      expect(error.code).toBe('INVALID_CREDENTIALS');
      expect(error.status).toBe(401);
      expect(error.message).toContain('incorrect');
      expect(error.action).toContain('reset your password');
    });

    it('should map INVALID_RESET_CODE', () => {
      const httpErr = new HttpErrorResponse({
        status: 400,
        error: { error: 'INVALID_RESET_CODE', message: 'Code expired' }
      });
      const error = ErrorMapper.map(httpErr);
      expect(error.code).toBe('INVALID_RESET_CODE');
      expect(error.status).toBe(400);
      expect(error.message).toContain('verification code is invalid or has expired');
      expect(error.action).toContain('request a new one');
    });

    it('should map ACCOUNT_LOCKED', () => {
      const httpErr = new HttpErrorResponse({
        status: 423,
        error: { error: 'ACCOUNT_LOCKED', message: 'Locked' }
      });
      const error = ErrorMapper.map(httpErr);
      expect(error.code).toBe('ACCOUNT_LOCKED');
      expect(error.status).toBe(423);
      expect(error.message).toContain('temporarily locked');
      expect(error.action).toContain('15 minutes');
    });

    it('should map ACCOUNT_DEACTIVATED', () => {
      const httpErr = new HttpErrorResponse({
        status: 403,
        error: { error: 'ACCOUNT_DEACTIVATED', message: 'Deactivated' }
      });
      const error = ErrorMapper.map(httpErr);
      expect(error.code).toBe('ACCOUNT_DEACTIVATED');
      expect(error.status).toBe(403);
      expect(error.message).toContain('deactivated');
      expect(error.action).toContain('reactivate');
    });

    it('should map NOTIFICATION_DELIVERY_FAILED', () => {
      const httpErr = new HttpErrorResponse({
        status: 502,
        error: { error: 'NOTIFICATION_DELIVERY_FAILED', message: 'Failed' }
      });
      const error = ErrorMapper.map(httpErr);
      expect(error.code).toBe('NOTIFICATION_DELIVERY_FAILED');
      expect(error.status).toBe(502);
      expect(error.message).toContain('could not deliver your verification code');
    });

    it('should map VALIDATION_ERROR with fieldErrors', () => {
      const httpErr = new HttpErrorResponse({
        status: 400,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          fieldErrors: { password: 'Password must be at least 8 characters' }
        }
      });
      const error = ErrorMapper.map(httpErr);
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.fieldErrors?.['password']).toBe('Password must be at least 8 characters');
    });
  });
});
