import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';
import { guestGuard } from './core/guards/guest.guard';

export const routes: Routes = [
  // Developer Styleguide Showcase (FE-01)
  {
    path: 'styleguide',
    loadComponent: () =>
      import('./features/styleguide/styleguide.component').then((m) => m.StyleguideComponent)
  },

  // Guest Authentication Routes (guarded by guestGuard)
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/login/login.component').then((m) => m.LoginComponent)
  },
  {
    path: 'register',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/register/register.component').then((m) => m.RegisterComponent)
  },
  {
    path: 'forgot-password',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/forgot-password/forgot-password.component').then((m) => m.ForgotPasswordComponent)
  },
  {
    path: 'reset-password',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/reset-password/reset-password.component').then((m) => m.ResetPasswordComponent)
  },

  // Customer Routes (wrapped in CustomerLayoutComponent)
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./core/layout/customer-layout.component').then((m) => m.CustomerLayoutComponent),
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent)
      },
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      }
    ]
  },

  // Admin Routes (wrapped in AdminLayoutComponent, guarded by roleGuard)
  {
    path: 'admin',
    canActivate: [roleGuard],
    data: { role: 'ADMIN' },
    loadComponent: () =>
      import('./core/layout/admin-layout.component').then((m) => m.AdminLayoutComponent),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent)
      }
    ]
  },

  // Error Pages (FE-04)
  {
    path: 'forbidden',
    loadComponent: () =>
      import('./core/pages/forbidden/forbidden.component').then((m) => m.ForbiddenComponent)
  },
  {
    path: '404',
    loadComponent: () =>
      import('./core/pages/not-found/not-found.component').then((m) => m.NotFoundComponent)
  },
  {
    path: '**',
    redirectTo: '404'
  }
];
