import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Route guard for FR-02 role-based routing. Use the `data: { role: 'ADMIN' }`
 * route config to additionally restrict a route to Admins only.
 */
export const authGuard: CanActivateFn = (route) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    router.navigate(['/login']);
    return false;
  }

  const requiredRole = route.data?.['role'];
  if (requiredRole && authService.role() !== requiredRole) {
    router.navigate(['/dashboard']);
    return false;
  }

  return true;
};
