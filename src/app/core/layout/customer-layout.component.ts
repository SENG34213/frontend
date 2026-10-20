import {
  Component,
  inject,
  signal,
  computed,
  ChangeDetectionStrategy,
  OnInit,
  OnDestroy,
  ElementRef,
  ViewChild,
  HostListener
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { Subject, takeUntil, filter } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { UserService } from '../services/user.service';
import { BadgeComponent } from '../../shared/ui/badge/badge.component';
import { NotificationCenterComponent } from '../../shared/components/notification-center/notification-center.component';
import { ProfileModalComponent } from '../../shared/components/profile-modal/profile-modal.component';
import { ButtonComponent } from '../../shared/ui/button/button.component';
import { ModalComponent } from '../../shared/ui/modal/modal.component';

@Component({
  selector: 'gc-customer-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    BadgeComponent,
    NotificationCenterComponent,
    ProfileModalComponent,
    ButtonComponent,
    ModalComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './customer-layout.component.html',
  styleUrl: './customer-layout.component.scss'
})
export class CustomerLayoutComponent implements OnInit, OnDestroy {
  readonly authService = inject(AuthService);
  readonly userService = inject(UserService);
  private readonly router = inject(Router);

  readonly profileModalOpen = signal(false);
  readonly showLogoutModal = signal(false);
  @ViewChild('avatarBtn') avatarBtn?: ElementRef<HTMLButtonElement>;
  @ViewChild('userDropdown') userDropdown?: ElementRef<HTMLDivElement>;

  readonly mobileMenuOpen = signal<boolean>(false);
  readonly dropdownOpen = signal<boolean>(false);
  readonly imageLoadFailed = signal<boolean>(false);

  private readonly destroy$ = new Subject<void>();

  // Profile data
  readonly userInitial = computed(() => {
    const user = this.authService.currentUser();
    const email = user?.email || user?.sub || 'U';
    return email.charAt(0).toUpperCase();
  });

  readonly userDisplayName = computed(() => {
    const profile = this.userService.currentProfile();
    if (profile?.fullName) return profile.fullName;
    const authUser = this.authService.currentUser();
    return authUser?.fullName || authUser?.email || authUser?.sub || 'Player';
  });

  readonly userEmail = computed(() => {
    const profile = this.userService.currentProfile();
    if (profile?.email) return profile.email;
    const authUser = this.authService.currentUser();
    return authUser?.email || authUser?.sub || '';
  });

  readonly userRole = computed(() => {
    const profile = this.userService.currentProfile();
    if (profile?.role) return profile.role;
    return this.authService.role() || 'CUSTOMER';
  });

  readonly avatarImageUrl = computed(() => {
    if (this.imageLoadFailed()) return null;
    const profile = this.userService.currentProfile();
    return profile?.profileImageUrl || profile?.avatarUrl || null;
  });

  ngOnInit(): void {
    // Fetch profile once (cached in UserService signal)
    this.userService.getMyProfile().pipe(takeUntil(this.destroy$)).subscribe();

    // Close menus on route change
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.closeDropdown(false);
        this.closeMobileMenu();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen.set(false);
  }

  openProfileModal(): void {
    this.profileModalOpen.set(true);
  }

  closeProfileModal(): void {
    this.profileModalOpen.set(false);
  }

  toggleDropdown(): void {
    const nextState = !this.dropdownOpen();
    this.dropdownOpen.set(nextState);
    if (nextState) {
      setTimeout(() => {
        const first = this.userDropdown?.nativeElement.querySelector<HTMLElement>('[role="menuitem"]');
        first?.focus();
      });
    }
  }

  closeDropdown(returnFocus = true): void {
    if (this.dropdownOpen()) {
      this.dropdownOpen.set(false);
      if (returnFocus) {
        this.avatarBtn?.nativeElement.focus();
      }
    }
  }

  onImageError(): void {
    this.imageLoadFailed.set(true);
  }

  openLogoutModal(): void {
    this.closeDropdown(false);
    this.showLogoutModal.set(true);
  }

  cancelLogout(): void {
    this.showLogoutModal.set(false);
  }

  confirmLogout(): void {
    this.showLogoutModal.set(false);
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  onLogout(): void {
    this.openLogoutModal();
  }

  onMenuKeydown(event: KeyboardEvent): void {
    if (!this.dropdownOpen()) return;

    if (event.key === 'Escape') {
      event.preventDefault();
      this.closeDropdown(true);
      return;
    }

    const items = Array.from(
      this.userDropdown?.nativeElement.querySelectorAll<HTMLElement>('[role="menuitem"]') || []
    );
    if (items.length === 0) return;

    const currentIndex = items.indexOf(document.activeElement as HTMLElement);

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      const nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % items.length;
      items[nextIndex].focus();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      const prevIndex = currentIndex < 0 ? items.length - 1 : (currentIndex - 1 + items.length) % items.length;
      items[prevIndex].focus();
    } else if (event.key === 'Tab') {
      this.closeDropdown(false);
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.dropdownOpen()) return;
    const target = event.target as Node | null;
    if (
      target &&
      !this.userDropdown?.nativeElement.contains(target) &&
      !this.avatarBtn?.nativeElement.contains(target)
    ) {
      this.closeDropdown(false);
    }
  }
}
