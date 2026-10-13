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

    // Check if server returned a structured error message
    const serverMessage = typeof serverBody === 'object' && serverBody !== null
      ? (serverBody.message || serverBody.error)
      : null;

    switch (status) {
      case 0:
        return {
          status: 0,
          message: 'Unable to connect to the Gaming Castle server.',
          action: 'Please check your internet connection or verify the server is running.'
        };

      case 400:
        return {
          status: 400,
          message: serverMessage || 'Some of the information submitted is invalid.',
          action: 'Please check the highlighted fields above and correct any mistakes.',
          fieldErrors: typeof serverBody?.fieldErrors === 'object' ? serverBody.fieldErrors : undefined
        };

      case 401:
        return {
          status: 401,
          message: 'Your session has expired or you are not signed in.',
          action: 'Please sign in with your credentials to continue.'
        };

      case 403:
        return {
          status: 403,
          message: 'You do not have permission to view or perform this action.',
          action: 'Contact a Gaming Castle manager if you believe you should have access.'
        };

      case 404:
        return {
          status: 404,
          message: serverMessage || 'The requested resource could not be found.',
          action: 'Please verify the link or return to the main dashboard.'
        };

      case 409:
        // FR-08 / NFR-08: Slot unavailable conflict
        if (serverMessage?.includes('SLOT') || error.url?.includes('booking')) {
          return {
            status: 409,
            message: 'That slot was just taken by another player.',
            action: 'Please pick another available time slot from the grid.'
          };
        }
        return {
          status: 409,
          message: serverMessage || 'A conflict occurred with the current state of this item.',
          action: 'Please refresh the page to view the latest status and try again.'
        };

      case 422:
        return {
          status: 422,
          message: serverMessage || 'Unable to process your request with the provided details.',
          action: 'Please review your input values and try again.'
        };

      case 500:
      case 502:
      case 503:
      case 504:
        return {
          status,
          message: 'The Gaming Castle server encountered a temporary issue.',
          action: 'Our team has been notified. Please try again in 1–2 minutes.'
        };

      default:
        return {
          status,
          message: serverMessage || 'An unexpected error occurred.',
          action: 'Please refresh the page and try again.'
        };
    }
  }
}
