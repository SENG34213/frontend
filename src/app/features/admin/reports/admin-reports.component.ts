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
  AdminReportResponse,
  ReportDataPoint
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

  formatCellValue(val: any, format?: string): string {
    if (val === null || val === undefined) return '—';
    if (format === 'currency') return `LKR ${Number(val).toLocaleString()}`;
    if (format === 'percentage') return `${val}%`;
    if (format === 'number') return Number(val).toLocaleString();
    return String(val);
  }
}
