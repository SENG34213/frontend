import { HttpErrorResponse } from '@angular/common/http';
import { ApiError } from '../../shared/models/api-response.model';

export class ErrorMapper {
  /**
   * Transforms an HttpErrorResponse or unknown error into a plain-English ApiError
   * strictly adhering to NFR-08: "Errors in plain English with a corrective action".
   */
  static map(error: unknown): ApiError {
    if (!(error instanceof HttpErrorResponse)) {
      return {
        status: 0,
        message: 'An unexpected application error occurred.',
        action: 'Please refresh the page or try again in a few moments.'
      };
    }

    const status = error.status;
    const serverBody = error.error;

    // Extract backend error code if present
    const rawCode: string | undefined =
      typeof serverBody === 'object' && serverBody !== null
        ? (serverBody.code || (typeof serverBody.error === 'string' && /^[A-Z0-9_]+$/.test(serverBody.error) ? serverBody.error : undefined))
        : undefined;

    // Check if server returned a structured error message
    const serverMessage = typeof serverBody === 'object' && serverBody !== null
      ? (serverBody.message || (typeof serverBody.error === 'string' && !rawCode ? serverBody.error : undefined))
      : null;

    const fieldErrors = typeof serverBody?.fieldErrors === 'object' && serverBody.fieldErrors !== null
      ? serverBody.fieldErrors
      : undefined;

    // Check known backend error codes first for tailored plain-English messages & actions (NFR-08)
    if (rawCode) {
      switch (rawCode) {
        case 'EMAIL_TAKEN':
          return {
            status: status || 409,
            code: 'EMAIL_TAKEN',
            message: 'This email address is already registered.',
            action: 'Sign in with your password or use a different email.'
          };

        case 'PHONE_TAKEN':
          return {
            status: status || 409,
            code: 'PHONE_TAKEN',
            message: 'This phone number is already registered.',
            action: 'Sign in with your password or use a different phone number.'
          };

        case 'INVALID_CREDENTIALS':
          return {
            status: status || 401,
            code: 'INVALID_CREDENTIALS',
            message: 'The email/phone or password you entered is incorrect.',
            action: 'Please check your details and try again, or reset your password.'
          };

        case 'INVALID_RESET_CODE':
          return {
            status: status || 400,
            code: 'INVALID_RESET_CODE',
            message: 'The 6-digit verification code is invalid or has expired.',
            action: 'Please check your messages for the latest code or request a new one.'
          };

        case 'ACCOUNT_LOCKED':
          return {
            status: status || 423,
            code: 'ACCOUNT_LOCKED',
            message: 'This account has been temporarily locked due to too many failed login attempts.',
            action: 'Please wait 15 minutes before trying again, or reset your password.'
          };

        case 'ACCOUNT_DEACTIVATED':
          return {
            status: status || 403,
            code: 'ACCOUNT_DEACTIVATED',
            message: 'This account has been deactivated.',
            action: 'You can reactivate your account by requesting a reactivation code.'
          };

        case 'ACCOUNT_DEACTIVATED_BY_ADMIN':
          return {
            status: status || 403,
            code: 'ACCOUNT_DEACTIVATED_BY_ADMIN',
            message: 'This account has been suspended by an administrator.',
            action: 'Please contact Gaming Castle support for assistance.'
          };

        case 'ACCOUNT_DISABLED':
          return {
            status: status || 403,
            code: 'ACCOUNT_DISABLED',
            message: 'This account has been disabled.',
            action: 'Please contact Gaming Castle support for assistance.'
          };

        case 'NOTIFICATION_DELIVERY_FAILED':
          return {
            status: status || 502,
            code: 'NOTIFICATION_DELIVERY_FAILED',
            message: 'We could not deliver your verification code right now.',
            action: 'Please verify your contact details or try again in a few minutes.'
          };

        case 'USER_NOT_FOUND':
          return {
            status: status || 404,
            code: 'USER_NOT_FOUND',
            message: 'No account was found with those details.',
            action: 'Please check your email/phone number or register for a new account.'
          };

        case 'VALIDATION_ERROR':
          return {
            status: status || 400,
            code: 'VALIDATION_ERROR',
            message: (serverMessage && serverMessage !== 'Request validation failed')
              ? serverMessage
              : 'Some of the information submitted is invalid.',
            action: 'Please check the highlighted fields above and correct any mistakes.',
            fieldErrors
          };
      }
    }

    switch (status) {
      case 0:
        return {
          status: 0,
          code: rawCode,
          message: 'Unable to connect to the Gaming Castle server.',
          action: 'Please check your internet connection or verify the server is running.'
        };

      case 400:
        return {
          status: 400,
          code: rawCode,
          message: serverMessage || 'Some of the information submitted is invalid.',
          action: 'Please check the highlighted fields above and correct any mistakes.',
          fieldErrors
        };

      case 401:
        return {
          status: 401,
          code: rawCode,
          message: 'Your session has expired or you are not signed in.',
          action: 'Please sign in with your credentials to continue.'
        };

      case 403:
        return {
          status: 403,
          code: rawCode,
          message: 'You do not have permission to view or perform this action.',
          action: 'Contact a Gaming Castle manager if you believe you should have access.'
        };

      case 404:
        return {
          status: 404,
          code: rawCode,
          message: serverMessage || 'The requested resource could not be found.',
          action: 'Please verify the link or return to the main dashboard.'
        };

      case 409:
        // FR-08 / NFR-08: Slot unavailable conflict
        if (serverMessage?.includes('SLOT') || error.url?.includes('booking')) {
          return {
            status: 409,
            code: rawCode,
            message: 'That slot was just taken by another player.',
            action: 'Please pick another available time slot from the grid.'
          };
        }
        return {
          status: 409,
          code: rawCode,
          message: serverMessage || 'A conflict occurred with the current state of this item.',
          action: 'Please refresh the page to view the latest status and try again.'
        };

      case 422:
        return {
          status: 422,
          code: rawCode,
          message: serverMessage || 'Unable to process your request with the provided details.',
          action: 'Please review your input values and try again.',
          fieldErrors
        };

      case 423:
        return {
          status: 423,
          code: rawCode || 'ACCOUNT_LOCKED',
          message: 'This account has been temporarily locked due to too many failed login attempts.',
          action: 'Please wait 15 minutes before trying again, or reset your password.'
        };

      case 500:
      case 502:
      case 503:
      case 504:
        return {
          status,
          code: rawCode,
          message: 'The Gaming Castle server encountered a temporary issue.',
          action: 'Our team has been notified. Please try again in 1–2 minutes.'
        };

      default:
        return {
          status,
          code: rawCode,
          message: serverMessage || 'An unexpected error occurred.',
          action: 'Please refresh the page and try again.'
        };
    }
  }
}
