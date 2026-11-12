import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { forkJoin } from 'rxjs';
import { UserService } from '../../core/services/user.service';
import { LoyaltyService } from '../../core/services/loyalty.service';
import { AuthService } from '../../core/services/auth.service';
import { UserProfile } from '../../shared/models/user.model';
import { LoyaltyBalanceDto, LoyaltyTier } from '../../shared/models/loyalty.model';
import { CardComponent } from '../../shared/ui/card/card.component';
import { BadgeComponent, BadgeVariant } from '../../shared/ui/badge/badge.component';
import { ButtonComponent } from '../../shared/ui/button/button.component';
import { SkeletonComponent } from '../../shared/ui/skeleton/skeleton.component';
import { EmptyStateComponent } from '../../shared/ui/empty-state/empty-state.component';
import { ProfileModalComponent } from '../../shared/components/profile-modal/profile-modal.component';

export interface NextTierProgress {
  nextTier: string;
  pointsNeeded: number;
  percent: number;
  label: string;
}

@Component({
  selector: 'gc-profile',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    CardComponent,
    BadgeComponent,
    ButtonComponent,
    SkeletonComponent,
    EmptyStateComponent,
    ProfileModalComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss'
})
export class ProfileComponent implements OnInit {
  private readonly userService = inject(UserService);
  private readonly loyaltyService = inject(LoyaltyService);
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);

  readonly profile = signal<UserProfile | null>(null);
  readonly loyalty = signal<LoyaltyBalanceDto | null>(null);
  readonly isLoading = signal<boolean>(true);
  readonly hasError = signal<boolean>(false);
  readonly imageLoadFailed = signal<boolean>(false);
  readonly editModalOpen = signal<boolean>(false);

  readonly userInitial = computed(() => {
    const p = this.profile();
    const name = p?.fullName || this.authService.currentUser()?.fullName || p?.email || this.authService.currentUser()?.email || 'U';
    return name.charAt(0).toUpperCase();
  });

  readonly avatarImageUrl = computed(() => {
    if (this.imageLoadFailed()) return null;
    const p = this.profile();
    return p?.profileImageUrl || p?.avatarUrl || null;
  });

  readonly loyaltyTier = computed<LoyaltyTier>(() => {
    return this.loyalty()?.tier || this.loyaltyService.userTier();
  });

  readonly pointsBalance = computed<number>(() => {
    return this.loyalty()?.pointsBalance ?? this.loyaltyService.userPoints();
  });

  readonly discountValue = computed<number>(() => {
    const loy = this.loyalty();
    if (loy?.equivalentDiscountLkr != null) return loy.equivalentDiscountLkr;
    return this.pointsBalance();
  });

  readonly tierBadgeVariant = computed<BadgeVariant>(() => {
    switch (this.loyaltyTier()) {
      case 'GOLD':
      case 'VIP':
        return 'warning';
      case 'SILVER':
        return 'accent';
      case 'BRONZE':
      default:
        return 'info';
    }
  });

  readonly tierIcon = computed<string>(() => {
    switch (this.loyaltyTier()) {
      case 'GOLD':
      case 'VIP':
        return '🥇';
      case 'SILVER':
        return '🥈';
      case 'BRONZE':
      default:
        return '🥉';
    }
  });

  readonly tierGlowClass = computed<string>(() => {
    switch (this.loyaltyTier()) {
      case 'GOLD':
      case 'VIP':
        return 'tier-gold-ring';
      case 'SILVER':
        return 'tier-silver-ring';
      case 'BRONZE':
      default:
        return 'tier-bronze-ring';
    }
  });

  readonly silverThreshold = computed<number>(() => {
    return this.loyalty()?.silverThreshold ?? this.loyaltyService.silverThreshold();
  });

  readonly goldThreshold = computed<number>(() => {
    return this.loyalty()?.goldThreshold ?? this.loyaltyService.goldThreshold();
  });

  readonly silverMultiplier = computed<number>(() => {
    return this.loyalty()?.silverMultiplier ?? this.loyaltyService.silverMultiplier();
  });

  readonly goldMultiplier = computed<number>(() => {
    return this.loyalty()?.goldMultiplier ?? this.loyaltyService.goldMultiplier();
  });

  readonly nextTierProgress = computed<NextTierProgress>(() => {
    const pts = this.pointsBalance();
    const silver = this.silverThreshold();
    const gold = this.goldThreshold();

    if (pts > gold) {
      return {
        nextTier: 'MAX TIER',
        pointsNeeded: 0,
        percent: 100,
        label: 'Gold Champion (Top Tier)'
      };
    } else if (pts >= silver) {
      const range = Math.max(1, gold - silver);
      const progress = Math.max(0, pts - silver);
      const needed = Math.max(1, (gold + 1) - pts);
      const percent = Math.min(100, Math.round((progress / range) * 100));
      return {
        nextTier: 'GOLD',
        pointsNeeded: needed,
        percent,
        label: needed === 1 ? '1 point to unlock Gold' : `${needed.toLocaleString()} points to unlock Gold`
      };
    } else {
      const needed = Math.max(1, silver - pts);
      const percent = Math.min(100, Math.round((pts / Math.max(1, silver)) * 100));
      return {
        nextTier: 'SILVER',
        pointsNeeded: needed,
        percent,
        label: `${needed.toLocaleString()} points to unlock Silver`
      };
    }
  });

  readonly tierMultiplierLabel = computed<string>(() => {
    switch (this.loyaltyTier()) {
      case 'GOLD':
      case 'VIP':
        return `${this.goldMultiplier()}x Points Multiplier Active`;
      case 'SILVER':
        return `${this.silverMultiplier()}x Points Multiplier Active`;
      case 'BRONZE':
      default:
        return '1.0x Standard Points Rate';
    }
  });

  readonly memberId = computed<string>(() => {
    const id = this.profile()?.id || this.authService.getUserId() || '00000000';
    return `GC-${id.replace(/-/g, '').substring(0, 8).toUpperCase()}`;
  });

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      if (params['edit'] === 'true') {
        this.openEditModal();
      }
    });
    this.loadProfileData();
  }

  openEditModal(): void {
    this.editModalOpen.set(true);
  }

  onProfileUpdated(updated: UserProfile): void {
    this.profile.set(updated);
    this.imageLoadFailed.set(false);
    this.userService.getMyProfile(true)?.subscribe?.({
      next: (p) => {
        if (p) this.profile.set(p);
      }
    });
    this.loyaltyService.refreshBalance()?.subscribe?.({
      next: (l) => {
        if (l) this.loyalty.set(l);
      }
    });
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
