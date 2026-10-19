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
        path: 'bookings',
        loadComponent: () =>
          import('./features/bookings/bookings.component').then((m) => m.BookingsComponent)
      },
      {
        path: 'book',
        redirectTo: 'bookings',
        pathMatch: 'full'
      },
      {
        path: 'tournaments',
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./features/tournaments/tournaments-list/tournaments-list.component').then(
                (m) => m.TournamentsListComponent
              )
          },
          {
            path: ':id',
            loadComponent: () =>
              import('./features/tournaments/tournament-detail/tournament-detail.component').then(
                (m) => m.TournamentDetailComponent
              )
          },
          {
            path: ':id/bracket',
            loadComponent: () =>
              import('./features/tournaments/tournament-bracket/tournament-bracket.component').then(
                (m) => m.TournamentBracketComponent
              )
          }
        ]
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./features/profile/profile.component').then((m) => m.ProfileComponent)
      },
      {
        path: 'my-bookings',
        loadComponent: () =>
          import('./features/my-bookings/my-bookings.component').then((m) => m.MyBookingsComponent)
      },
      {
        path: 'my-tournaments',
        loadComponent: () =>
          import('./features/my-tournaments/my-tournaments.component').then((m) => m.MyTournamentsComponent)
      },
      {
        path: 'loyalty',
        loadComponent: () =>
          import('./features/loyalty/loyalty.component').then((m) => m.LoyaltyComponent)
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
          import('./features/admin/dashboard/admin-dashboard.component').then((m) => m.AdminDashboardComponent)
      },
      {
        path: 'bookings',
        loadComponent: () =>
          import('./features/admin/bookings/admin-bookings.component').then((m) => m.AdminBookingsComponent)
      },
      {
        path: 'stations',
        loadComponent: () =>
          import('./features/admin/stations/admin-stations.component').then((m) => m.AdminStationsComponent)
      },
      {
        path: 'tournaments',
        loadComponent: () =>
          import('./features/admin/tournaments/admin-tournaments.component').then((m) => m.AdminTournamentsComponent)
      },
      {
        path: 'users',
        loadComponent: () =>
          import('./features/admin/users/admin-users.component').then((m) => m.AdminUsersComponent)
      },
      {
        path: 'payments',
        loadComponent: () =>
          import('./features/admin/payments/admin-payments.component').then((m) => m.AdminPaymentsComponent)
      },
      {
        path: 'reports',
        loadComponent: () =>
          import('./features/admin/reports/admin-reports.component').then((m) => m.AdminReportsComponent)
      },
      {
        path: 'games',
        loadComponent: () =>
          import('./features/admin/games/admin-games.component').then((m) => m.AdminGamesComponent)
      },
      {
        path: 'loyalty',
        loadComponent: () =>
          import('./features/admin/loyalty/admin-loyalty.component').then((m) => m.AdminLoyaltyComponent)
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
