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
});
