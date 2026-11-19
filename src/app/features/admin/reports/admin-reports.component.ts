import {
  Component, OnInit, OnDestroy, signal, computed, inject, ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

import { ReportAdminService } from './report-admin.service';
import {
  ReportType,
  DateRangePreset,
  ReportFilter,
  AdminReportResponse
} from '../../../shared/models';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { BadgeComponent } from '../../../shared/ui/badge/badge.component';
import { SkeletonComponent } from '../../../shared/ui/skeleton/skeleton.component';
import { EmptyStateComponent } from '../../../shared/ui/empty-state/empty-state.component';

@Component({
  selector: 'gc-admin-reports',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    DatePipe,
    ButtonComponent,
    BadgeComponent,
    SkeletonComponent,
    EmptyStateComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-reports.component.html',
  styleUrl: './admin-reports.component.scss'
})
export class AdminReportsComponent implements OnInit, OnDestroy {
  private readonly reportService = inject(ReportAdminService);
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroy$ = new Subject<void>();

  // ── Signals ────────────────────────────────────────────────────────────────
  readonly activeType = signal<ReportType>('revenue');
  readonly activePreset = signal<DateRangePreset>('30days');
  readonly customStart = signal<string>('');
  readonly customEnd = signal<string>('');

  readonly reportData = signal<AdminReportResponse | null>(null);
  readonly isLoading = signal<boolean>(false);
  readonly isExporting = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  // Computed max trend value for proportional chart bar heights
  readonly maxTrendValue = computed(() => {
    const data = this.reportData();
    if (!data || !data.trend.length) return 1;
    const max = Math.max(...data.trend.map(t => t.primaryValue));
    return max > 0 ? max : 1;
  });

  // ── Advanced Multi-Style Chart Computations ─────────────────────────────────
  readonly chartWidth = 1000;
  readonly chartHeight = 240;
  readonly hoveredPointIndex = signal<number | null>(null);

  // Computed data points mapped to SVG coordinates (0..1000, 0..240)
  readonly trendChartPoints = computed(() => {
    const data = this.reportData();
    if (!data || !data.trend.length) return [];
    const max = this.maxTrendValue();
    const count = data.trend.length;
    const padX = 40;
    const padY = 28;
    const availW = this.chartWidth - padX * 2;
    const availH = this.chartHeight - padY * 2;

    return data.trend.map((pt, i) => {
      const x = count <= 1 ? this.chartWidth / 2 : padX + (i / (count - 1)) * availW;
      const ratio = Math.max(0, Math.min(1, pt.primaryValue / max));
      const y = this.chartHeight - padY - ratio * availH;
      const secRatio = pt.secondaryValue ? Math.max(0, Math.min(1, pt.secondaryValue / max)) : 0;
      const secY = this.chartHeight - padY - secRatio * availH;

      return {
        ...pt,
        index: i,
        x: Math.round(x),
        y: Math.round(y),
        secY: Math.round(secY),
        ratio,
        pctHeight: Math.max(6, Math.round(ratio * 100))
      };
    });
  });

  // Smooth cubic Bezier spline path for Revenue
  readonly revenueLinePath = computed(() => {
    const pts = this.trendChartPoints();
    if (!pts.length) return '';
    if (pts.length === 1) return `M ${pts[0].x},${pts[0].y}`;

    let path = `M ${pts[0].x},${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i];
      const p1 = pts[i + 1];
      const midX = (p0.x + p1.x) / 2;
      path += ` C ${midX},${p0.y} ${midX},${p1.y} ${p1.x},${p1.y}`;
    }
    return path;
  });

  // Closed area path for gradient fill beneath the curve
  readonly revenueAreaPath = computed(() => {
    const pts = this.trendChartPoints();
    if (!pts.length) return '';
    const line = this.revenueLinePath();
    const lastX = pts[pts.length - 1].x;
    const firstX = pts[0].x;
    const bottomY = this.chartHeight - 10;
    return `${line} L ${lastX},${bottomY} L ${firstX},${bottomY} Z`;
  });

  // Peak revenue point for highlighted banner
  readonly peakPoint = computed(() => {
    const pts = this.trendChartPoints();
    if (!pts.length) return null;
    return pts.reduce((max, p) => (p.primaryValue > max.primaryValue ? p : max), pts[0]);
  });

  // Donut chart segments for breakdown section (Circumference = 2 * PI * 65 ≈ 408.4)
  readonly donutCircumference = 2 * Math.PI * 65;
  readonly donutSegments = computed(() => {
    const data = this.reportData();
    if (!data || !data.breakdowns.length) return [];
    const total = data.breakdowns.reduce((sum, b) => sum + (b.percentage || 0), 0) || 100;
    let accumulated = 0;

    return data.breakdowns.map((b) => {
      const pct = (b.percentage || 0) / total;
      const strokeLength = pct * this.donutCircumference;
      const offset = -(accumulated * this.donutCircumference);
      accumulated += pct;
      return {
        ...b,
        dashArray: `${strokeLength.toFixed(1)} ${this.donutCircumference.toFixed(1)}`,
        dashOffset: offset.toFixed(1)
      };
    });
  });

  // Utilization average percentage
  readonly averageUtilization = computed(() => {
    const data = this.reportData();
    if (!data) return 65;
    const kpi = data.kpis.find(k => k.id === 'kpi-avg-util');
    if (kpi && typeof kpi.numericValue === 'number') {
      return Math.min(100, Math.max(0, Math.round(kpi.numericValue)));
    }
    if (kpi && typeof kpi.value === 'string') {
      const match = kpi.value.match(/\d+/);
      if (match) return Math.min(100, Math.max(0, parseInt(match[0], 10)));
    }
    return 68;
  });

  // Station occupancy items for Utilization matrix
  readonly stationOccupancyList = computed(() => {
    const data = this.reportData();
    if (!data || data.reportType !== 'utilization') return [];
    return data.tableData.map(row => {
      const occ = typeof row['occupancyPct'] === 'number' ? Math.round(row['occupancyPct'] as number) : 70;
      return {
        station: String(row['stationCode'] || 'Station'),
        type: String(row['type'] || 'Console'),
        occupancy: occ,
        hours: Number(row['hoursBooked'] || 0),
        revenue: Number(row['revenueGen'] || 0)
      };
    });
  });

  // Bookings channel ratio (Online vs Walk-in)
  readonly bookingsRatio = computed(() => {
    const data = this.reportData();
    if (!data || data.reportType !== 'bookings') return { online: 70, walkin: 30 };
    const online = data.breakdowns.find(b => b.category.toLowerCase().includes('online'))?.percentage ?? 70;
    const walkin = data.breakdowns.find(b => b.category.toLowerCase().includes('walk'))?.percentage ?? 30;
    return { online, walkin };
  });

  // Stepped area path for user growth
  readonly userGrowthLinePath = computed(() => {
    const pts = this.trendChartPoints();
    if (!pts.length) return '';
    if (pts.length === 1) return `M ${pts[0].x},${pts[0].y}`;

    let path = `M ${pts[0].x},${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i];
      const p1 = pts[i + 1];
      path += ` L ${p1.x},${p0.y} L ${p1.x},${p1.y}`;
    }
    return path;
  });

  readonly userGrowthAreaPath = computed(() => {
    const pts = this.trendChartPoints();
    if (!pts.length) return '';
    const line = this.userGrowthLinePath();
    const lastX = pts[pts.length - 1].x;
    const firstX = pts[0].x;
    const bottomY = this.chartHeight - 10;
    return `${line} L ${lastX},${bottomY} L ${firstX},${bottomY} Z`;
  });

  readonly availableTypes: { id: ReportType; label: string; icon: string }[] = [
    { id: 'revenue', label: 'Revenue & Finance', icon: '💰' },
    { id: 'utilization', label: 'Station Utilization', icon: '🎮' },
    { id: 'bookings', label: 'Bookings & Manifest', icon: '📅' },
    { id: 'users', label: 'Gamer Growth', icon: '👥' }
  ];

  readonly presets: { id: DateRangePreset; label: string }[] = [
    { id: 'today', label: 'Today' },
    { id: '7days', label: 'Last 7 Days' },
    { id: '30days', label: 'Last 30 Days' },
    { id: 'this_month', label: 'This Month' },
    { id: 'custom', label: 'Custom Range' }
  ];

  ngOnInit(): void {
    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe(params => {
      if (params['type'] && ['revenue', 'utilization', 'bookings', 'users'].includes(params['type'])) {
        this.activeType.set(params['type'] as ReportType);
      }
      if (params['preset'] && ['today', '7days', '30days', 'this_month', 'custom'].includes(params['preset'])) {
        this.activePreset.set(params['preset'] as DateRangePreset);
      }
      if (params['start']) this.customStart.set(params['start']);
      if (params['end']) this.customEnd.set(params['end']);

      this.loadReport();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Actions ────────────────────────────────────────────────────────────────
  selectType(type: ReportType): void {
    if (this.activeType() === type) return;
    this.activeType.set(type);
    this.updateQueryParams();
  }

  selectPreset(preset: DateRangePreset): void {
    this.activePreset.set(preset);
    this.updateQueryParams();
  }

  applyCustomRange(): void {
    if (!this.customStart() || !this.customEnd()) {
      this.toast.error('Date range required', 'Please select both start and end dates.');
      return;
    }
    if (new Date(this.customStart()) > new Date(this.customEnd())) {
      this.toast.error('Invalid date range', 'Start date cannot be after end date.');
      return;
    }
    this.updateQueryParams();
  }

  private updateQueryParams(): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        type: this.activeType(),
        preset: this.activePreset(),
        start: this.activePreset() === 'custom' ? this.customStart() : null,
        end: this.activePreset() === 'custom' ? this.customEnd() : null
      },
      queryParamsHandling: 'merge'
    });
  }

  loadReport(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    const filter: ReportFilter = {
      type: this.activeType(),
      preset: this.activePreset(),
      startDate: this.activePreset() === 'custom' ? this.customStart() : undefined,
      endDate: this.activePreset() === 'custom' ? this.customEnd() : undefined
    };

    this.reportService.getReport(filter).pipe(takeUntil(this.destroy$)).subscribe({
      next: data => {
        this.reportData.set(data);
        this.isLoading.set(false);
      },
      error: err => {
        this.errorMessage.set(
          err?.message || 'Failed to generate report. Please check server connectivity and try again.'
        );
        this.isLoading.set(false);
      }
    });
  }

  exportCsv(): void {
    this.isExporting.set(true);
    const filter: ReportFilter = {
      type: this.activeType(),
      preset: this.activePreset(),
      startDate: this.activePreset() === 'custom' ? this.customStart() : undefined,
      endDate: this.activePreset() === 'custom' ? this.customEnd() : undefined
    };

    this.reportService.exportReportCsv(filter).pipe(takeUntil(this.destroy$)).subscribe({
      next: blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `gaming-castle-${this.activeType()}-report-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
        this.toast.success('Report Exported', 'CSV report downloaded successfully.');
        this.isExporting.set(false);
      },
      error: () => {
        this.toast.error('Export Failed', 'Could not generate CSV export. Please try again.');
        this.isExporting.set(false);
      }
    });
  }

  printReport(): void {
    window.print();
  }

  getBarHeightPct(val: number): number {
    const max = this.maxTrendValue();
    return Math.max(8, Math.round((val / max) * 100));
  }

  formatCellValue(val: unknown, format?: string): string {
    if (val === null || val === undefined) return '—';
    if (format === 'currency') return `LKR ${Number(val).toLocaleString()}`;
    if (format === 'percentage') return `${val}%`;
    if (format === 'number') return Number(val).toLocaleString();
    if (format === 'date') {
      try {
        const d = new Date(val as string | number | Date);
        return isNaN(d.getTime()) ? String(val) : d.toLocaleDateString('en-US', {
          month: 'short', day: 'numeric', year: 'numeric'
        });
      } catch {
        return String(val);
      }
    }
    return String(val);
  }
}
