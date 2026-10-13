import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Ensures user has the required role specified in route data `data: { role: 'ADMIN' }`.
 * If unauthorized, redirects to /forbidden.
 */
export const roleGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
    return false;
  }

  const expectedRole = route.data?.['role'];
  if (expectedRole && authService.role() !== expectedRole) {
    router.navigate(['/forbidden']);
    return false;
  }

  return true;
};
