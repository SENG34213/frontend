import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { ToastService } from '../../shared/ui/toast/toast.service';
import { ErrorMapper } from '../http/error-mapper';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const authService = inject(AuthService);
  const toastService = inject(ToastService);

  return next(req).pipe(
    catchError((error: unknown) => {
      const mappedError = ErrorMapper.map(error);

      if (error instanceof HttpErrorResponse) {
        if (error.status === 401) {
          const currentUrl = router.url;
          const isAuthFlow =
            currentUrl.includes('/login') ||
            currentUrl.includes('/register') ||
            currentUrl.includes('/forgot-password') ||
            currentUrl.includes('/reset-password') ||
            req.url.includes('/auth/');

          // Only redirect if not already on an auth page or performing auth action
          if (!isAuthFlow) {
            const token = authService.getToken();
            const tokenExpired = authService.isTokenExpired();

            // Allow guest browsing: public GET requests should not kick visitors off public pages
            const isPublicRead =
              req.method === 'GET' &&
              (req.url.endsWith('/api/tournaments') ||
                req.url.endsWith('/tournaments') ||
                req.url.includes('/api/stations') ||
                req.url.includes('/api/games')) &&
              !req.url.includes('/my-') &&
              !req.url.includes('/admin');

            if (!token && isPublicRead) {
              return throwError(() => mappedError);
            }

            if (!token || tokenExpired) {
              authService.logout(currentUrl);
              toastService.warning(mappedError.message || 'Your session has expired. Please log in again.', 'Session Expired');
              router.navigate(['/login'], { queryParams: { returnUrl: currentUrl } });
            } else {
              toastService.error(mappedError.message || 'You do not have permission to perform this action.', 'Unauthorized');
            }
          }
        } else if (error.status === 403) {
          const isBackgroundProfileCall = req.url.includes('/users/me') || req.url.includes('/users/profile');
          if (!isBackgroundProfileCall) {
            router.navigate(['/forbidden']);
          }
        } else if (error.status === 0) {
          toastService.error(`${mappedError.message} ${mappedError.action}`, 'Connection Error');
        } else if (error.status >= 500) {
          toastService.error(`${mappedError.message} ${mappedError.action}`, 'Server Error');
        }
      }

      return throwError(() => mappedError);
    })
  );
};
