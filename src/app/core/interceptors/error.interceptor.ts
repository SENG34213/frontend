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
          // Only redirect if not already on an auth page
          if (!currentUrl.includes('/login') && !currentUrl.includes('/register')) {
            authService.logout(currentUrl);
            toastService.warning(mappedError.message, 'Session Expired');
            router.navigate(['/login'], { queryParams: { returnUrl: currentUrl } });
          }
        } else if (error.status === 403) {
          router.navigate(['/forbidden']);
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
