import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { NotificationSocketService } from '../services/notification-socket.service';
import { ButtonComponent } from '../../shared/ui/button/button.component';
import { BadgeComponent } from '../../shared/ui/badge/badge.component';
import { NotificationCenterComponent } from '../../shared/components/notification-center/notification-center.component';

@Component({
  selector: 'gc-customer-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, ButtonComponent, BadgeComponent, NotificationCenterComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './customer-layout.component.html',
  styleUrl: './customer-layout.component.scss'
})
export class CustomerLayoutComponent {
  readonly authService = inject(AuthService);
  readonly notifService = inject(NotificationSocketService);
  private readonly router = inject(Router);

  mobileMenuOpen = signal(false);

  closeMobileMenu(): void {
    this.mobileMenuOpen.set(false);
  }

  onLogout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
