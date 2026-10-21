import {
  Component, OnInit, signal, computed, inject, ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import {
  BookingAdminService,
  BookingFilter,
  PagedAdminBookings,
  WalkInRequest,
  RescheduleRequest
} from './booking-admin.service';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { AdminBookingRow, Station, UserSummaryResponse } from '../../../shared/models';
import { StationAdminService } from '../stations/station-admin.service';
import { UserAdminService } from '../users/user-admin.service';
import { NotificationSocketService } from '../../../core/services/notification-socket.service';
import {
  ButtonComponent,
  CardComponent,
  BadgeComponent,
  SkeletonComponent,
  EmptyStateComponent,
  ModalComponent,
  PaginationComponent,
  BadgeVariant
} from '../../../shared/ui';

@Component({
  selector: 'app-admin-bookings',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    ButtonComponent,
    CardComponent,
    BadgeComponent,
    SkeletonComponent,
    EmptyStateComponent,
    ModalComponent,
    PaginationComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-bookings.component.html',
  styleUrl: './admin-bookings.component.scss'
})
export class AdminBookingsComponent implements OnInit {
  private readonly svc = inject(BookingAdminService);
  private readonly stationSvc = inject(StationAdminService);
  private readonly userSvc = inject(UserAdminService);
  private readonly notifSocketService = inject(NotificationSocketService);
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  // ── Table State ─────────────────────────────────────────────────────────
  readonly isLoading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly pagedResult = signal<PagedAdminBookings | null>(null);

  readonly currentPage = signal(0);
  readonly pageSize = signal(20);
  readonly sortField = signal('createdAt');
  readonly sortDir = signal<'asc' | 'desc'>('desc');

  // ── Filters (live in URL) ────────────────────────────────────────────────
  readonly filterStatus = signal('');
  readonly filterSource = signal('');
  readonly filterSearch = signal('');

  // ── Selection / Detail Panel ─────────────────────────────────────────────
  readonly selectedBooking = signal<AdminBookingRow | null>(null);
  readonly detailPanelOpen = signal(false);

  // ── Modals ───────────────────────────────────────────────────────────────
  readonly walkInModalOpen = signal(false);
  readonly paymentModalOpen = signal(false);
  readonly selectedBookingForPayment = signal<AdminBookingRow | null>(null);
  readonly rescheduleModalOpen = signal(false);
  readonly cancelModalOpen = signal(false);
  readonly actionInFlight = signal(false);
  readonly actionTarget = signal<AdminBookingRow | null>(null);

  // ── Forms ────────────────────────────────────────────────────────────────
  walkInForm!: FormGroup;
  paymentForm!: FormGroup;
  rescheduleForm!: FormGroup;

  // ── Dropdown Data for Walk-In / Reschedule ─────────────────────────────────
  readonly stations = signal<Station[]>([]);
  readonly customers = signal<UserSummaryResponse[]>([]);
  readonly customerSearch = signal<string>('');
  readonly filteredCustomers = computed(() => {
    const q = this.customerSearch().trim().toLowerCase();
    const list = this.customers();
    if (!q) return list;
    return list.filter(c =>
      (c.fullName && c.fullName.toLowerCase().includes(q)) ||
      (c.email && c.email.toLowerCase().includes(q)) ||
      (c.phoneNumber && c.phoneNumber.includes(q))
    );
  });

  // ── Computed ─────────────────────────────────────────────────────────────
  readonly rows = computed(() => this.pagedResult()?.content ?? []);
  readonly totalPages = computed(() => this.pagedResult()?.totalPages ?? 1);
  readonly totalElements = computed(() => this.pagedResult()?.totalElements ?? 0);

  readonly sortLabel = computed(() =>
    `${this.sortField()},${this.sortDir()}`
  );

  // ── Select Options ───────────────────────────────────────────────────────
  readonly statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'PENDING', label: 'Pending' },
    { value: 'CONFIRMED', label: 'Confirmed' },
    { value: 'IN_PROGRESS', label: 'In Progress' },
    { value: 'COMPLETED', label: 'Completed' },
    { value: 'CANCELLED', label: 'Cancelled' }
  ];

  readonly sourceOptions = [
    { value: '', label: 'All Channels' },
    { value: 'ONLINE', label: 'Online' },
    { value: 'WALK_IN', label: 'Walk-in' }
  ];

  readonly sortOptions = [
    { value: 'createdAt,desc', label: 'Newest First' },
    { value: 'createdAt,asc', label: 'Oldest First' },
    { value: 'startTime,asc', label: 'Start Time ↑' },
    { value: 'startTime,desc', label: 'Start Time ↓' },
    { value: 'payableAmount,desc', label: 'Amount (High → Low)' },
    { value: 'payableAmount,asc', label: 'Amount (Low → High)' }
  ];

  ngOnInit(): void {
    // Read URL query params on init
    this.route.queryParams.subscribe((params) => {
      if (params['status']) this.filterStatus.set(params['status']);
      if (params['source']) this.filterSource.set(params['source']);
      if (params['search']) this.filterSearch.set(params['search']);
      if (params['page']) this.currentPage.set(Number(params['page']));
    });

    this.initForms();
    this.loadDropdownData();
    this.loadBookings();
  }

  private loadDropdownData(): void {
    this.stationSvc.getAllStations().subscribe({
      next: (stations) => {
        this.stations.set(stations.filter(s => s.active !== false));
      },
      error: () => {}
    });

    this.userSvc.getUsers({ size: 100, page: 0 }).subscribe({
      next: (res) => {
        this.customers.set(res.content || []);
      },
      error: () => {}
    });
  }

  private initForms(): void {
    const today = new Date();
    const oneHourLater = new Date(today.getTime() + 60 * 60_000);

    this.walkInForm = this.fb.group({
      targetUserId: ['', Validators.required],
      stationId: ['', Validators.required],
      startTime: [this.toLocalDatetimeStr(oneHourLater), Validators.required],
      endTime: [this.toLocalDatetimeStr(new Date(oneHourLater.getTime() + 60 * 60_000)), Validators.required]
    });

    this.rescheduleForm = this.fb.group({
      stationId: ['', Validators.required],
      startTime: ['', Validators.required],
      endTime: ['', Validators.required]
    });

    this.paymentForm = this.fb.group({
      amount: [0, [Validators.required, Validators.min(1)]],
      method: ['CASH', Validators.required]
    });
  }

  loadBookings(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    const filter: BookingFilter = {
      status: this.filterStatus() || undefined,
      source: this.filterSource() || undefined,
      page: this.currentPage(),
      size: this.pageSize(),
      sort: this.sortLabel()
    };

    this.syncUrlParams();
    this.svc.getBookings(filter).subscribe({
      next: (paged) => {
        this.pagedResult.set(paged);
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set(
          'Unable to load bookings. The booking service may be unavailable. Check your connection and try again.'
        );
        this.isLoading.set(false);
      }
    });
  }

  private syncUrlParams(): void {
    const queryParams: Record<string, string | number> = { page: this.currentPage() };
    if (this.filterStatus()) queryParams['status'] = this.filterStatus();
    if (this.filterSource()) queryParams['source'] = this.filterSource();
    if (this.filterSearch()) queryParams['search'] = this.filterSearch();
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }

  onPageChange(page: number): void {
    this.currentPage.set(page);
    this.loadBookings();
  }

  onSortChange(sort: string): void {
    const [field, dir] = sort.split(',');
    this.sortField.set(field);
    this.sortDir.set(dir as 'asc' | 'desc');
    this.currentPage.set(0);
    this.loadBookings();
  }

  onStatusChange(status: string): void {
    this.filterStatus.set(status as string);
    this.currentPage.set(0);
    this.loadBookings();
  }

  onSourceChange(source: string): void {
    this.filterSource.set(source as string);
    this.currentPage.set(0);
    this.loadBookings();
  }

  clearFilters(): void {
    this.filterStatus.set('');
    this.filterSource.set('');
    this.filterSearch.set('');
    this.currentPage.set(0);
    this.loadBookings();
  }

  // ── Detail Panel ─────────────────────────────────────────────────────────
  openDetail(booking: AdminBookingRow): void {
    this.selectedBooking.set(booking);
    this.detailPanelOpen.set(true);
  }

  closeDetail(): void {
    this.detailPanelOpen.set(false);
  }

  onOverlayClick(e: MouseEvent): void {
    if (e.target === e.currentTarget) {
      this.closeDetail();
    }
  }

  // ── Walk-In ──────────────────────────────────────────────────────────────
  openWalkIn(): void {
    this.walkInForm.reset({
      targetUserId: '',
      stationId: '',
      startTime: this.toLocalDatetimeStr(new Date(Date.now() + 60 * 60_000)),
      endTime: this.toLocalDatetimeStr(new Date(Date.now() + 2 * 60 * 60_000))
    });
    this.walkInModalOpen.set(true);
  }

  submitWalkIn(): void {
    if (this.walkInForm.invalid) {
      this.walkInForm.markAllAsTouched();
      return;
    }

    this.actionInFlight.set(true);
    const { targetUserId, stationId, startTime, endTime } = this.walkInForm.value;
    const body: WalkInRequest = {
      targetUserId,
      stationId,
      startTime: new Date(startTime).toISOString(),
      endTime: new Date(endTime).toISOString()
    };

    this.svc.createWalkIn(body).subscribe({
      next: (createdBooking) => {
        this.walkInModalOpen.set(false);
        this.actionInFlight.set(false);
        this.toast.success('Walk-in booking created with PENDING status.');

        // Real-time notification broadcast
        const stName = this.stations().find(s => s.id === stationId)?.name || createdBooking?.stationCode || 'station';
        this.notifSocketService.sendNotification({
          type: 'BOOKING_CREATED',
          title: 'Walk-In Slot Reserved (Pending Payment)',
          message: `Walk-in booking created for ${stName}. Complete payment to confirm slot.`,
          link: '/admin/bookings',
          targetUserId: targetUserId,
          data: { stationId, targetUserId, bookingId: createdBooking?.id }
        });

        this.loadBookings();

        // Prompt admin to finish payment and confirm slot immediately
        if (createdBooking) {
          this.openPaymentModal(createdBooking);
        }
      },
      error: (err) => {
        this.actionInFlight.set(false);
        const msg = err?.error?.message || 'Failed to create walk-in booking. Ensure the station is available at that time.';
        this.toast.error(msg);
      }
    });
  }

  // ── Walk-In Payment & Confirmation ─────────────────────────────────────────
  openPaymentModal(booking: AdminBookingRow, event?: Event): void {
    if (event) event.stopPropagation();
    this.selectedBookingForPayment.set(booking);
    const amount = this.getAmount(booking);
    this.paymentForm.reset({
      amount: amount > 0 ? Number(amount.toFixed(2)) : 1000,
      method: 'CASH'
    });
    this.paymentModalOpen.set(true);
  }

  cancelPaymentModal(): void {
    this.paymentModalOpen.set(false);
    this.toast.info('Booking remains in PENDING status. You can finish payment anytime from the bookings table.');
  }

  submitPayment(): void {
    const booking = this.selectedBookingForPayment();
    if (!booking) return;

    if (this.paymentForm.invalid) {
      this.paymentForm.markAllAsTouched();
      return;
    }

    const { amount, method } = this.paymentForm.value;
    const finalAmount = Number(amount) || this.getAmount(booking);

    this.actionInFlight.set(true);
    this.svc.finishBookingPayment(booking.id, booking.userId, finalAmount, method)
      .subscribe({
        next: (confirmed) => {
          this.actionInFlight.set(false);
          this.paymentModalOpen.set(false);
          this.toast.success(`Payment of LKR ${finalAmount.toFixed(2)} received! Slot confirmed.`);

          this.notifSocketService.sendNotification({
            type: 'BOOKING_CONFIRMED',
            title: 'Walk-In Slot Confirmed',
            message: `Walk-in payment completed. Slot confirmed for ${booking.stationCode || 'station'}.`,
            link: '/admin/bookings',
            targetUserId: booking.userId,
            data: { bookingId: booking.id, paymentId: confirmed?.paymentId }
          });

          this.loadBookings();
          if (this.selectedBooking()?.id === booking.id) {
            this.selectedBooking.set({
              ...this.selectedBooking()!,
              status: 'CONFIRMED',
              paymentId: confirmed?.paymentId
            });
          }
        },
        error: (err) => {
          this.actionInFlight.set(false);
          const msg = err?.error?.message || err?.message || 'Payment processing failed. You can retry anytime.';
          this.toast.error(msg);
        }
      });
  }

  getCustomerName(userId: string): string {
    const found = this.customers().find(c => c.id === userId);
    return found ? `${found.fullName} (${found.email})` : `User ${userId.slice(0, 8)}…`;
  }

  // ── Cancel ───────────────────────────────────────────────────────────────
  openCancel(booking: AdminBookingRow, event: Event): void {
    event.stopPropagation();
    this.actionTarget.set(booking);
    this.cancelModalOpen.set(true);
  }

  confirmCancel(): void {
    const booking = this.actionTarget();
    if (!booking) return;

    this.actionInFlight.set(true);
    this.svc.cancelBooking(booking.id).subscribe({
      next: () => {
        this.cancelModalOpen.set(false);
        this.actionInFlight.set(false);
        this.actionTarget.set(null);
        this.toast.success(`Booking ${booking.id.slice(0, 8)}… cancelled. The customer will receive a notification.`);

        // Real-time notification broadcast
        this.notifSocketService.sendNotification({
          type: 'BOOKING_CANCELLED',
          title: 'Booking Cancelled',
          message: `Booking #${booking.id.slice(0, 8)} on ${booking.stationCode || 'station'} was cancelled.`,
          link: '/admin/bookings',
          targetUserId: booking.userId,
          data: { bookingId: booking.id, stationCode: booking.stationCode }
        });

        this.loadBookings();
      },
      error: (err) => {
        this.actionInFlight.set(false);
        const msg = err?.error?.message || 'Unable to cancel this booking. It may already be in progress or completed.';
        this.toast.error(msg);
      }
    });
  }

  // ── Reschedule ───────────────────────────────────────────────────────────
  openReschedule(booking: AdminBookingRow, event: Event): void {
    event.stopPropagation();
    this.actionTarget.set(booking);
    this.rescheduleForm.reset({
      stationId: booking.stationId,
      startTime: this.toLocalDatetimeStr(new Date(booking.startTime)),
      endTime: this.toLocalDatetimeStr(new Date(booking.endTime))
    });
    this.rescheduleModalOpen.set(true);
  }

  submitReschedule(): void {
    if (this.rescheduleForm.invalid) {
      this.rescheduleForm.markAllAsTouched();
      return;
    }

    const booking = this.actionTarget();
    if (!booking) return;

    this.actionInFlight.set(true);
    const { stationId, startTime, endTime } = this.rescheduleForm.value;
    const body: RescheduleRequest = {
      stationId,
      startTime: new Date(startTime).toISOString(),
      endTime: new Date(endTime).toISOString()
    };

    this.svc.rescheduleBooking(booking.id, body).subscribe({
      next: () => {
        this.rescheduleModalOpen.set(false);
        this.actionInFlight.set(false);
        this.actionTarget.set(null);
        this.toast.success('Booking rescheduled. Customer notification sent.');

        // Real-time notification broadcast
        const formattedTime = new Date(startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        this.notifSocketService.sendNotification({
          type: 'BOOKING_RESCHEDULED',
          title: 'Booking Rescheduled',
          message: `Booking #${booking.id.slice(0, 8)} rescheduled to ${formattedTime}.`,
          link: '/admin/bookings',
          targetUserId: booking.userId,
          data: { bookingId: booking.id, stationId, startTime, endTime }
        });

        this.loadBookings();
      },
      error: (err) => {
        this.actionInFlight.set(false);
        const msg = err?.error?.message || 'Unable to reschedule. The new time slot may already be taken.';
        this.toast.error(msg);
      }
    });
  }

  // ── Export ───────────────────────────────────────────────────────────────
  exportCsv(): void {
    const url = this.svc.exportCsv({
      status: this.filterStatus() || undefined,
      source: this.filterSource() || undefined
    });
    window.open(url, '_blank');
  }

  // ── Helpers ──────────────────────────────────────────────────────────────
  getStatusVariant(status: string): BadgeVariant {
    switch (status) {
      case 'IN_PROGRESS': return 'available';
      case 'CONFIRMED': return 'primary';
      case 'PENDING': return 'warning';
      case 'COMPLETED': return 'neutral';
      case 'CANCELLED': return 'occupied';
      default: return 'neutral';
    }
  }

  canCancel(booking: AdminBookingRow): boolean {
    return ['PENDING', 'CONFIRMED'].includes(booking.status);
  }

  canReschedule(booking: AdminBookingRow): boolean {
    return booking.status === 'CONFIRMED';
  }

  formatDateTime(iso: string): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('en-LK', {
      timeZone: 'Asia/Colombo',
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }

  formatTime(iso: string): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleTimeString('en-LK', {
      timeZone: 'Asia/Colombo',
      hour: '2-digit', minute: '2-digit'
    });
  }

  getDuration(booking: AdminBookingRow | { durationMinutes?: number; startTime?: string; endTime?: string }): string {
    const b = booking as AdminBookingRow;
    if (b.durationMinutes && Number(b.durationMinutes) > 0) {
      const totalMins = Number(b.durationMinutes);
      const hrs = Math.floor(totalMins / 60);
      const mins = totalMins % 60;
      if (hrs > 0 && mins > 0) return `${hrs}h ${mins}m`;
      if (hrs > 0) return `${hrs}h`;
      return `${mins}m`;
    }
    if (b.startTime && b.endTime) {
      const diffMs = new Date(b.endTime).getTime() - new Date(b.startTime).getTime();
      const totalMins = Math.max(0, Math.round(diffMs / 60000));
      const hrs = Math.floor(totalMins / 60);
      const mins = totalMins % 60;
      if (hrs > 0 && mins > 0) return `${hrs}h ${mins}m`;
      if (hrs > 0) return `${hrs}h`;
      return `${mins}m`;
    }
    return '1h';
  }

  getAmount(booking: AdminBookingRow | Partial<AdminBookingRow>): number {
    const b = booking as AdminBookingRow;
    if (b.payableAmount !== undefined && b.payableAmount !== null && Number(b.payableAmount) > 0) {
      return Number(b.payableAmount);
    }
    if (b.totalAmount !== undefined && b.totalAmount !== null && Number(b.totalAmount) > 0) {
      return Number(b.totalAmount);
    }

    // Determine hourly rate
    let rate = Number(b.hourlyRate) || 0;

    // If rate not on booking, lookup from stations list
    if (rate <= 0) {
      const stList = this.stations();
      const st = stList.find(
        (s) => (b.stationId && s.id === b.stationId) ||
               (b.stationCode && (s.stationCode === b.stationCode || s.name === b.stationCode))
      );
      if (st && st.hourlyRate) {
        rate = Number(st.hourlyRate);
      }
    }

    // Default standard rates if station lookup is still resolving
    if (rate <= 0) {
      const codeOrType = ((b.stationCode || '') + ' ' + (b.stationType || '')).toUpperCase();
      if (codeOrType.includes('PC')) rate = 300;
      else if (codeOrType.includes('VR')) rate = 600;
      else rate = 400; // Console (PS5 / Xbox) default
    }

    if (b.startTime && b.endTime) {
      const diffMs = new Date(b.endTime).getTime() - new Date(b.startTime).getTime();
      const hours = Math.max(0.5, diffMs / 3600000);
      return Math.round(rate * hours * 100) / 100;
    }

    return rate;
  }

  private toLocalDatetimeStr(d: Date): string {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
}
