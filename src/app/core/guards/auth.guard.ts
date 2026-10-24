import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { ToastService } from '../../shared/ui/toast/toast.service';

/**
 * Ensures user is authenticated. If not, captures returnUrl
 * and navigates to /login.
 */
export const authGuard: CanActivateFn = (_route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const toastService = inject(ToastService, { optional: true });

  if (authService.isAuthenticated()) {
    return true;
  }

  toastService?.info('Please sign in to access your account.', 'Sign In Required');
  router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
  return false;
};
