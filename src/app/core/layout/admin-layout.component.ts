import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { ButtonComponent } from '../../shared/ui/button/button.component';
import { BadgeComponent } from '../../shared/ui/badge/badge.component';
import { ModalComponent } from '../../shared/ui/modal/modal.component';
import { NotificationCenterComponent } from '../../shared/components/notification-center/notification-center.component';
import { ProfileModalComponent } from '../../shared/components/profile-modal/profile-modal.component';

@Component({
  selector: 'gc-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, ButtonComponent, BadgeComponent, ModalComponent, NotificationCenterComponent, ProfileModalComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-layout.component.html',
  styleUrl: './admin-layout.component.scss'
})
export class AdminLayoutComponent implements OnInit {
  readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  sidebarCollapsed = signal(false);
  mobileNavOpen = signal(false);
  profileModalOpen = signal(false);
  readonly showLogoutModal = signal(false);

  ngOnInit(): void {
    if (this.authService.isAuthenticated()) {
      this.authService.getMyProfile().subscribe({
        error: () => {
          // Non-blocking fallback
        }
      });
    }
  }

  toggleMobileNav(): void {
    this.mobileNavOpen.update((v) => !v);
  }

  closeMobileNav(): void {
    this.mobileNavOpen.set(false);
  }

  openLogoutModal(): void {
    this.closeMobileNav();
    this.showLogoutModal.set(true);
  }

  cancelLogout(): void {
    this.showLogoutModal.set(false);
  }

  confirmLogout(): void {
    this.showLogoutModal.set(false);
    this.onLogout();
  }

  onLogout(): void {
    this.closeMobileNav();
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
