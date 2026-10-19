import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { forkJoin } from 'rxjs';
import { UserService } from '../../core/services/user.service';
import { LoyaltyService } from '../../core/services/loyalty.service';
import { AuthService } from '../../core/services/auth.service';
import { UserProfile } from '../../shared/models/user.model';
import { LoyaltyBalanceDto } from '../../shared/models/loyalty.model';
import { CardComponent } from '../../shared/ui/card/card.component';
import { BadgeComponent } from '../../shared/ui/badge/badge.component';
import { SkeletonComponent } from '../../shared/ui/skeleton/skeleton.component';
import { EmptyStateComponent } from '../../shared/ui/empty-state/empty-state.component';

@Component({
  selector: 'gc-profile',
  standalone: true,
  imports: [
    CommonModule,
    CardComponent,
    BadgeComponent,
    SkeletonComponent,
    EmptyStateComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss'
})
export class ProfileComponent implements OnInit {
  private readonly userService = inject(UserService);
  private readonly loyaltyService = inject(LoyaltyService);
  private readonly authService = inject(AuthService);

  readonly profile = signal<UserProfile | null>(null);
  readonly loyalty = signal<LoyaltyBalanceDto | null>(null);
  readonly isLoading = signal<boolean>(true);
  readonly hasError = signal<boolean>(false);
  readonly imageLoadFailed = signal<boolean>(false);

  readonly userInitial = computed(() => {
    const p = this.profile();
    const email = p?.email || this.authService.currentUser()?.email || 'U';
    return email.charAt(0).toUpperCase();
  });

  readonly avatarImageUrl = computed(() => {
    if (this.imageLoadFailed()) return null;
    const p = this.profile();
    return p?.profileImageUrl || p?.avatarUrl || null;
  });

  ngOnInit(): void {
    this.loadProfileData();
  }

  loadProfileData(): void {
    this.isLoading.set(true);
    this.hasError.set(false);

    const userId = this.authService.getUserId() || undefined;

    forkJoin({
      profile: this.userService.getMyProfile(true),
      loyalty: this.loyaltyService.getBalance(userId)
    }).subscribe({
      next: ({ profile, loyalty }) => {
        if (!profile) {
          this.hasError.set(true);
        } else {
          this.profile.set(profile);
          this.loyalty.set(loyalty);
        }
        this.isLoading.set(false);
      },
      error: () => {
        this.hasError.set(true);
        this.isLoading.set(false);
      }
    });
  }

  onImageError(): void {
    this.imageLoadFailed.set(true);
  }

  formatDate(dateStr?: string): string {
    if (!dateStr) return 'Active Member';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  }
}
