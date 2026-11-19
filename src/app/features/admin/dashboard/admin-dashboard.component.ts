import { Component, OnInit, signal, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AdminService } from '../../../core/services/admin.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import {
  AdminBookingStatsResponse,
  AdminPaymentStatsResponse,
  AdminUserStatsResponse,
  AdminTournamentStatsResponse,
  AdminBookingRow,
  DailyRevenue
} from '../../../shared/models';
import {
  ButtonComponent,
  CardComponent,
  BadgeComponent,
  SkeletonComponent,
  EmptyStateComponent,
  BadgeVariant
} from '../../../shared/ui';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ButtonComponent,
    CardComponent,
    BadgeComponent,
    SkeletonComponent,
    EmptyStateComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.scss'
})
export class AdminDashboardComponent implements OnInit {
  private readonly adminService = inject(AdminService);
  private readonly toastService = inject(ToastService);
  readonly authService = inject(AuthService);

  // Loading & Error States
  readonly isLoading = signal<boolean>(true);
  readonly errorMessage = signal<string | null>(null);
  readonly lastSynced = signal<string>('');
  readonly selectedTrendDays = signal<number>(14);
  readonly selectedBookingFilter = signal<string>('ALL');
  readonly hoveredBar = signal<DailyRevenue | null>(null);

  // Data signals
  readonly bookingStats = signal<AdminBookingStatsResponse | null>(null);
  readonly paymentStats = signal<AdminPaymentStatsResponse | null>(null);
  readonly userStats = signal<AdminUserStatsResponse | null>(null);
  readonly tournamentStats = signal<AdminTournamentStatsResponse | null>(null);
  readonly recentBookings = signal<AdminBookingRow[]>([]);

  // Computed Properties for Chart
  readonly revenueTrend = computed(() => {
    const stats = this.paymentStats();
    if (!stats || !stats.revenueTrend) return [];
    return stats.revenueTrend.slice(-this.selectedTrendDays());
  });

  readonly maxRevenue = computed(() => {
    const trend = this.revenueTrend();
    if (!trend.length) return 1;
    const max = Math.max(...trend.map((t) => t.revenue));
    return max > 0 ? max : 1;
  });

  readonly totalTrendRevenue = computed(() => {
    return this.revenueTrend().reduce((sum, item) => sum + item.revenue, 0);
  });

  readonly averageDailyRevenue = computed(() => {
    const trend = this.revenueTrend();
    if (!trend.length) return 0;
    return Math.round(this.totalTrendRevenue() / trend.length);
  });

  // ── Enhanced Animated Chart Computations ────────────────────────────────────
  readonly chartSvgWidth = 600;
  readonly chartSvgHeight = 200;
  readonly chartBaseY = 170;
  readonly chartMaxHeight = 135;

  readonly chartBars = computed(() => {
    const trend = this.revenueTrend();
    if (!trend.length) return [];
    const max = this.maxRevenue();
    const count = trend.length;
    const barSpacing = this.chartSvgWidth / count;
    const barWidth = Math.max(8, Math.min(28, barSpacing * 0.65));

    return trend.map((item, i) => {
      const centerX = (i + 0.5) * barSpacing;
      const x = centerX - barWidth / 2;
      const ratio = Math.max(0, Math.min(1, item.revenue / max));
      const height = Math.max(6, Math.round(ratio * this.chartMaxHeight));
      const y = this.chartBaseY - height;

      return {
        ...item,
        index: i,
        centerX: Math.round(centerX),
        x: Math.round(x),
        y: Math.round(y),
        width: Math.round(barWidth),
        height,
        ratio,
        pct: Math.round(ratio * 100),
        label: this.formatDate(item.date)
      };
    });
  });

  // Smooth spline curve traversing the tops of the bars
  readonly trendSplinePath = computed(() => {
    const bars = this.chartBars();
    if (bars.length === 0) return '';
    if (bars.length === 1) return `M ${bars[0].centerX},${bars[0].y} L ${bars[0].centerX + 1},${bars[0].y}`;

    let path = `M ${bars[0].centerX},${bars[0].y}`;
    for (let i = 0; i < bars.length - 1; i++) {
      const p0 = bars[i];
      const p1 = bars[i + 1];
      const midX = (p0.centerX + p1.centerX) / 2;
      path += ` C ${midX},${p0.y} ${midX},${p1.y} ${p1.centerX},${p1.y}`;
    }
    return path;
  });

  // Closed area beneath the spline curve
  readonly trendAreaPath = computed(() => {
    const spline = this.trendSplinePath();
    const bars = this.chartBars();
    if (!spline || bars.length === 0) return '';
    const first = bars[0];
    const last = bars[bars.length - 1];
    return `${spline} L ${last.centerX},${this.chartBaseY} L ${first.centerX},${this.chartBaseY} Z`;
  });

  readonly peakDayItem = computed(() => {
    const trend = this.revenueTrend();
    if (!trend.length) return null;
    return trend.reduce((prev, curr) => (curr.revenue > prev.revenue ? curr : prev), trend[0]);
  });

  getHoveredBarLeftPct(date: string): number {
    const bars = this.chartBars();
    const bar = bars.find(b => b.date === date);
    if (!bar) return 50;
    return Math.round((bar.centerX / this.chartSvgWidth) * 1000) / 10;
  }

  readonly filteredBookings = computed(() => {
    const list = this.recentBookings();
    const filter = this.selectedBookingFilter();
    if (filter === 'ALL') return list;
    if (filter === 'IN_PROGRESS') return list.filter((b) => b.status === 'IN_PROGRESS');
    if (filter === 'CONFIRMED') return list.filter((b) => b.status === 'CONFIRMED');
    if (filter === 'WALK_IN') return list.filter((b) => b.source === 'WALK_IN');
    if (filter === 'ONLINE') return list.filter((b) => b.source === 'ONLINE');
    return list;
  });

  ngOnInit(): void {
    this.loadDashboardData();
  }

  loadDashboardData(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.adminService.getOverviewStats().subscribe({
      next: (overview) => {
        this.bookingStats.set(overview.bookings);
        this.paymentStats.set(overview.payments);
        this.userStats.set(overview.users);
        this.tournamentStats.set(overview.tournaments);
        this.lastSynced.set(new Date().toLocaleTimeString());
        this.loadRecentBookings();
      },
      error: () => {
        this.errorMessage.set('Failed to load dashboard metrics. Check backend connection or retry.');
        this.isLoading.set(false);
      }
    });
  }

  private loadRecentBookings(): void {
    this.adminService.getRecentBookings(8).subscribe({
      next: (rows) => {
        this.recentBookings.set(rows);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      }
    });
  }

  setTrendDays(days: number): void {
    this.selectedTrendDays.set(days);
    this.adminService.getPaymentStats(days).subscribe({
      next: (stats) => {
        this.paymentStats.set(stats);
      }
    });
  }

  setBookingFilter(filter: string): void {
    this.selectedBookingFilter.set(filter);
  }

  triggerRefresh(): void {
    this.loadDashboardData();
    this.toastService.info('Dashboard metrics refreshed');
  }

  exportBookings(): void {
    window.open(this.adminService.getBookingsExportUrl(), '_blank');
  }

  exportPayments(): void {
    window.open(this.adminService.getPaymentsExportUrl(), '_blank');
  }

  getStatusBadgeVariant(status: string): BadgeVariant {
    switch (status) {
      case 'IN_PROGRESS':
        return 'available';
      case 'CONFIRMED':
        return 'primary';
      case 'COMPLETED':
        return 'neutral';
      case 'CANCELLED':
        return 'occupied';
      default:
        return 'warning';
    }
  }

  formatTime(isoString: string): string {
    if (!isoString) return '--:--';
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return isoString;
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  formatDate(isoString: string): string {
    if (!isoString) return '';
    const parts = isoString.split('-');
    if (parts.length === 3) {
      return `${parts[1]}/${parts[2]}`;
    }
    return isoString;
  }
}
