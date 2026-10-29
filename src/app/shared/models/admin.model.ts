import { BookingStatus } from './booking.model';
import { UserRole } from './auth.model';

export interface AdminBookingStatsResponse {
  todayTotalBookings: number;
  todayConfirmedBookings: number;
  todayCancelledBookings: number;
  activeSessionsNow: number;
  monthTotalBookings: number;
  allTimeTotalBookings: number;
  allTimeCancelled: number;
}

export interface DailyRevenue {
  date: string;
  revenue: number;
}

export interface AdminPaymentStatsResponse {
  todayRevenue: number;
  monthRevenue: number;
  totalPaymentsSuccess: number;
  totalPaymentsFailed: number;
  revenueTrend: DailyRevenue[];
}

export interface AdminTournamentStatsResponse {
  totalTournaments: number;
  upcomingTournaments: number;
  ongoingTournaments: number;
  completedTournaments: number;
  cancelledTournaments: number;
  totalParticipants: number;
}

export interface AdminUserStatsResponse {
  totalUsers: number;
  activeUsers: number;
  deactivatedUsers: number;
  customerCount: number;
  adminCount: number;
  newUsersToday: number;
  newUsersThisMonth: number;
}

export interface AdminBookingRow {
  id: string;
  userId: string;
  stationId: string;
  stationCode?: string;
  stationType?: string;
  gameId?: string;
  gameTitle?: string;
  hourlyRate?: number;
  startTime: string;
  endTime: string;
  durationMinutes?: number;
  status: BookingStatus;
  source: 'ONLINE' | 'WALK_IN';
  paymentId?: string;
  totalAmount?: number;
  discountAmount?: number;
  payableAmount?: number;
  createdAt: string;
}

export interface AdminOverviewStats {
  bookings: AdminBookingStatsResponse;
  payments: AdminPaymentStatsResponse;
  users: AdminUserStatsResponse;
  tournaments: AdminTournamentStatsResponse;
}

export interface UserSummaryResponse {
  id: string;
  email: string;
  fullName: string;
  phoneNumber?: string;
  role: UserRole;
  enabled: boolean;
  createdAt?: string;
  deactivatedBy?: 'USER' | 'ADMIN' | null;
}

export interface AdminUpdateUserRequest {
  fullName: string;
  phoneNumber?: string;
  role?: UserRole;
  enabled?: boolean;
}

export interface PagedUsers {
  content: UserSummaryResponse[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

export interface UserFilter {
  search?: string;
  role?: UserRole | '';
  enabled?: boolean | null;
  page: number;
  size: number;
  sort?: string;
}
