import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of, throwError } from 'rxjs';

import { AdminReportsComponent } from './admin-reports.component';
import { ReportAdminService } from './report-admin.service';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { AdminReportResponse } from '../../../shared/models';

describe('AdminReportsComponent', () => {
  let component: AdminReportsComponent;
  let fixture: ComponentFixture<AdminReportsComponent>;
  let mockReportService: jasmine.SpyObj<ReportAdminService>;
  let mockToastService: jasmine.SpyObj<ToastService>;
  let mockRouter: jasmine.SpyObj<Router>;

  const mockReport: AdminReportResponse = {
    reportType: 'revenue',
    title: 'Financial Revenue & Collections Report',
    generatedAt: '2026-10-15T10:00:00Z',
    dateRange: {
      startDate: '2026-09-15',
      endDate: '2026-10-15'
    },
    kpis: [
      {
        id: 'kpi-tot-rev',
        label: 'Total Revenue',
        value: 'LKR 450,000',
        numericValue: 450000,
        changePct: 12.5,
        changeType: 'positive',
        helper: 'vs previous period'
      }
    ],
    trend: [
      { date: '2026-10-01', label: '10-01', primaryValue: 20000 },
      { date: '2026-10-02', label: '10-02', primaryValue: 35000 }
    ],
    breakdowns: [
      { category: 'Cards', value: 250000, formattedValue: 'LKR 250,000', percentage: 55 }
    ],
    tableColumns: [
      { key: 'date', label: 'Date', format: 'date' },
      { key: 'grossRevenue', label: 'Gross Revenue', format: 'currency' }
    ],
    tableData: [
      { date: '2026-10-01', grossRevenue: 20000 }
    ]
  };

  beforeEach(async () => {
    mockReportService = jasmine.createSpyObj('ReportAdminService', ['getReport', 'exportReportCsv']);
    mockToastService = jasmine.createSpyObj('ToastService', ['success', 'error', 'info', 'warning']);
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);

    mockReportService.getReport.and.returnValue(of(mockReport));
    mockReportService.exportReportCsv.and.returnValue(of(new Blob(['csv'], { type: 'text/csv' })));

    await TestBed.configureTestingModule({
      imports: [AdminReportsComponent],
      providers: [
        { provide: ReportAdminService, useValue: mockReportService },
        { provide: ToastService, useValue: mockToastService },
        { provide: Router, useValue: mockRouter },
        {
          provide: ActivatedRoute,
          useValue: {
            queryParams: of({ type: 'revenue', preset: '30days' })
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AdminReportsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the reports component', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize and load report data based on route params', () => {
    expect(component.activeType()).toBe('revenue');
    expect(component.activePreset()).toBe('30days');
    expect(mockReportService.getReport).toHaveBeenCalledWith(jasmine.objectContaining({
      type: 'revenue',
      preset: '30days'
    }));
    expect(component.reportData()).toEqual(mockReport);
  });

  it('should switch report type and update query params', () => {
    component.selectType('utilization');
    expect(component.activeType()).toBe('utilization');
    expect(mockRouter.navigate).toHaveBeenCalledWith([], jasmine.objectContaining({
      queryParams: jasmine.objectContaining({ type: 'utilization' })
    }));
  });

  it('should switch date preset and update query params', () => {
    component.selectPreset('7days');
    expect(component.activePreset()).toBe('7days');
    expect(mockRouter.navigate).toHaveBeenCalledWith([], jasmine.objectContaining({
      queryParams: jasmine.objectContaining({ preset: '7days' })
    }));
  });

  it('should validate custom date range before applying', () => {
    component.customStart.set('');
    component.customEnd.set('');
    component.applyCustomRange();
    expect(mockToastService.error).toHaveBeenCalledWith('Date range required', jasmine.any(String));

    component.customStart.set('2026-10-20');
    component.customEnd.set('2026-10-10');
    component.applyCustomRange();
    expect(mockToastService.error).toHaveBeenCalledWith('Invalid date range', jasmine.any(String));
  });

  it('should compute proportional bar heights correctly', () => {
    // max is 35000 in mockReport
    const height1 = component.getBarHeightPct(35000);
    expect(height1).toBe(100);

    const height2 = component.getBarHeightPct(17500);
    expect(height2).toBe(50);
  });

  it('should format cell values properly', () => {
    expect(component.formatCellValue(5000, 'currency')).toBe('LKR 5,000');
    expect(component.formatCellValue(88.4, 'percentage')).toBe('88.4%');
    expect(component.formatCellValue(1200, 'number')).toBe('1,200');
    expect(component.formatCellValue(null)).toBe('—');
  });

  it('should handle report loading error gracefully', () => {
    mockReportService.getReport.and.returnValue(throwError(() => new Error('Server connection timed out')));
    component.loadReport();

    expect(component.errorMessage()).toContain('Server connection timed out');
    expect(component.isLoading()).toBeFalse();
  });

  it('should trigger CSV export and display success toast', () => {
    component.exportCsv();
    expect(mockReportService.exportReportCsv).toHaveBeenCalled();
    expect(mockToastService.success).toHaveBeenCalledWith('Report Exported', jasmine.any(String));
    expect(component.isExporting()).toBeFalse();
  });
});
