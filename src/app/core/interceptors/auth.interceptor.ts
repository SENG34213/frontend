import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

/**
 * Attaches the JWT to every outgoing request (except the public auth
 * endpoints — no token exists yet at that point). The Gateway validates
 * this token; see backend/api-gateway JwtAuthenticationFilter.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getToken();

  const isPublicAuthCall = req.url.includes('/api/auth/login') || req.url.includes('/api/auth/register');

  if (token && !isPublicAuthCall) {
    req = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` }
    });
  }

  return next(req);
};
