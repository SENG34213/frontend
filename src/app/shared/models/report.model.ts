export type ReportType = 'revenue' | 'utilization' | 'bookings' | 'users';
export type DateRangePreset = 'today' | '7days' | '30days' | 'this_month' | 'custom';

export interface ReportFilter {
  type: ReportType;
  preset: DateRangePreset;
  startDate?: string;
  endDate?: string;
}

export interface ReportSummaryKpi {
  id: string;
  label: string;
  value: string;
  numericValue: number;
  changePct?: number;
  changeType?: 'positive' | 'negative' | 'neutral';
  helper?: string;
  icon?: string;
}

export interface ReportDataPoint {
  date: string;
  label: string;
  primaryValue: number;
  secondaryValue?: number;
  tertiaryValue?: number;
}

export interface ReportBreakdownItem {
  category: string;
  value: number;
  formattedValue: string;
  percentage: number;
  count?: number;
  color?: string;
}

export interface ReportTableColumn {
  key: string;
  label: string;
  align?: 'left' | 'center' | 'right';
  format?: 'currency' | 'number' | 'percentage' | 'date' | 'text' | 'badge';
}

export interface AdminReportResponse {
  reportType: ReportType;
  title: string;
  generatedAt: string;
  dateRange: {
    startDate: string;
    endDate: string;
  };
  kpis: ReportSummaryKpi[];
  trend: ReportDataPoint[];
  breakdowns: ReportBreakdownItem[];
  tableColumns: ReportTableColumn[];
  tableData: Record<string, any>[];
}
