import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { ButtonComponent } from '../../shared/ui/button/button.component';
import { BadgeComponent } from '../../shared/ui/badge/badge.component';
import { NotificationCenterComponent } from '../../shared/components/notification-center/notification-center.component';

@Component({
  selector: 'gc-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, ButtonComponent, BadgeComponent, NotificationCenterComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-layout.component.html',
  styleUrl: './admin-layout.component.scss'
})
export class AdminLayoutComponent {
  readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  sidebarCollapsed = signal(false);
  mobileNavOpen = signal(false);

  toggleMobileNav(): void {
    this.mobileNavOpen.update((v) => !v);
  }

  closeMobileNav(): void {
    this.mobileNavOpen.set(false);
  }

  onLogout(): void {
    this.closeMobileNav();
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
