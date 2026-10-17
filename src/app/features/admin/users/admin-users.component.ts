import {
  Component, OnInit, OnDestroy, signal, inject, ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';

import { UserAdminService } from './user-admin.service';
import {
  UserSummaryResponse,
  AdminUpdateUserRequest,
  AdminUserStatsResponse,
  UserFilter,
  UserRole
} from '../../../shared/models';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { CardComponent } from '../../../shared/ui/card/card.component';
import { BadgeComponent } from '../../../shared/ui/badge/badge.component';
import { ModalComponent } from '../../../shared/ui/modal/modal.component';
import { PaginationComponent } from '../../../shared/ui/pagination/pagination.component';
import { SkeletonComponent } from '../../../shared/ui/skeleton/skeleton.component';
import { EmptyStateComponent } from '../../../shared/ui/empty-state/empty-state.component';

@Component({
  selector: 'gc-admin-users',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    ButtonComponent,
    CardComponent,
    BadgeComponent,
    ModalComponent,
    PaginationComponent,
    SkeletonComponent,
    EmptyStateComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-users.component.html',
  styleUrl: './admin-users.component.scss'
})
export class AdminUsersComponent implements OnInit, OnDestroy {
  private readonly userAdminService = inject(UserAdminService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroy$ = new Subject<void>();

  // ── Signals ────────────────────────────────────────────────────────────────
  readonly users = signal<UserSummaryResponse[]>([]);
  readonly stats = signal<AdminUserStatsResponse | null>(null);
  readonly isLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly actionInFlight = signal(false);

  // Pagination & Filtering
  readonly currentPage = signal(0);
  readonly pageSize = signal(10);
  readonly totalElements = signal(0);
  readonly totalPages = signal(1);

  readonly searchQuery = signal('');
  readonly filterRole = signal<string>('');
  readonly filterEnabled = signal<string>('');

  // Modals & Drawers
  readonly editModalOpen = signal(false);
  readonly editingUser = signal<UserSummaryResponse | null>(null);

  readonly detailDrawerOpen = signal(false);
  readonly selectedUser = signal<UserSummaryResponse | null>(null);

  readonly toggleConfirmModalOpen = signal(false);
  readonly targetToggleUser = signal<UserSummaryResponse | null>(null);

  // ── Reactive Form ──────────────────────────────────────────────────────────
  readonly editForm = this.fb.group({
    fullName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
    phoneNumber: ['', [Validators.pattern(/^$|^(?:\+94|0)[0-9]{9}$/)]],
    role: ['CUSTOMER' as UserRole, [Validators.required]],
    enabled: [true]
  });

  // ── Options ────────────────────────────────────────────────────────────────
  readonly roleOptions = [
    { value: '', label: 'All Roles' },
    { value: 'CUSTOMER', label: 'Customers Only' },
    { value: 'ADMIN', label: 'Administrators Only' }
  ];

  readonly statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'ACTIVE', label: 'Active Accounts' },
    { value: 'DEACTIVATED', label: 'Deactivated Accounts' }
  ];

  // ── Lifecycle ──────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      if (params['search']) this.searchQuery.set(params['search']);
      if (params['role']) this.filterRole.set(params['role']);
      if (params['status']) this.filterEnabled.set(params['status']);
      if (params['page']) this.currentPage.set(Math.max(0, parseInt(params['page'], 10) || 0));
    });

    this.loadStats();
    this.loadUsers();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── API Operations ─────────────────────────────────────────────────────────
  loadStats(): void {
    this.userAdminService.getUserStats()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => this.stats.set(res),
        error: () => {
          // Non-critical, graceful fallback
        }
      });
  }

  loadUsers(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    let enabledBool: boolean | null = null;
    if (this.filterEnabled() === 'ACTIVE') enabledBool = true;
    if (this.filterEnabled() === 'DEACTIVATED') enabledBool = false;

    const filter: UserFilter = {
      search: this.searchQuery().trim() || undefined,
      role: (this.filterRole() as UserRole) || undefined,
      enabled: enabledBool,
      page: this.currentPage(),
      size: this.pageSize()
    };

    this.userAdminService.getUsers(filter)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (page) => {
          this.users.set(page.content);
          this.totalElements.set(page.totalElements);
          this.totalPages.set(Math.max(1, page.totalPages));
          this.isLoading.set(false);
        },
        error: (err) => {
          this.errorMessage.set(err?.message || 'Failed to load users from service');
          this.isLoading.set(false);
          this.toast.error('Could not load user accounts');
        }
      });
  }

  // ── Edit User ──────────────────────────────────────────────────────────────
  openEditModal(user: UserSummaryResponse, event?: Event): void {
    if (event) event.stopPropagation();
    this.editingUser.set(user);
    this.editForm.reset({
      fullName: user.fullName,
      phoneNumber: user.phoneNumber || '',
      role: user.role,
      enabled: user.enabled
    });
    this.editModalOpen.set(true);
  }

  submitEdit(): void {
    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }

    const target = this.editingUser();
    if (!target) return;

    const val = this.editForm.value;
    const req: AdminUpdateUserRequest = {
      fullName: (val.fullName || '').trim(),
      phoneNumber: (val.phoneNumber || '').trim() || undefined,
      role: val.role as UserRole,
      enabled: val.enabled ?? true
    };

    this.actionInFlight.set(true);
    this.userAdminService.updateUser(target.id, req)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updated) => {
          this.actionInFlight.set(false);
          this.editModalOpen.set(false);
          this.toast.success(`User "${updated.fullName}" updated successfully`);
          this.loadUsers();
          this.loadStats();
          if (this.selectedUser()?.id === target.id) {
            this.selectedUser.set(updated);
          }
        },
        error: (err) => {
          this.actionInFlight.set(false);
          this.toast.error(err?.message || 'Failed to update user profile');
        }
      });
  }

  // ── Deactivate / Activate Toggle ──────────────────────────────────────────
  promptToggleActive(user: UserSummaryResponse, event?: Event): void {
    if (event) event.stopPropagation();
    this.targetToggleUser.set(user);
    this.toggleConfirmModalOpen.set(true);
  }

  confirmToggleActive(): void {
    const user = this.targetToggleUser();
    if (!user) return;

    this.actionInFlight.set(true);

    const call$ = user.enabled
      ? this.userAdminService.deactivateUser(user.id)
      : this.userAdminService.activateUser(user.id);

    call$.pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.actionInFlight.set(false);
        this.toggleConfirmModalOpen.set(false);
        const actionStr = user.enabled ? 'deactivated' : 'reactivated';
        this.toast.success(`Account for ${user.fullName} has been ${actionStr}`);
        this.loadUsers();
        this.loadStats();
        if (this.selectedUser()?.id === user.id) {
          this.selectedUser.set({ ...user, enabled: !user.enabled });
        }
      },
      error: (err) => {
        this.actionInFlight.set(false);
        this.toast.error(err?.message || 'Failed to toggle account activation');
      }
    });
  }

  // ── Detail Drawer ──────────────────────────────────────────────────────────
  openDetail(user: UserSummaryResponse): void {
    this.selectedUser.set(user);
    this.detailDrawerOpen.set(true);
  }

  closeDetail(): void {
    this.detailDrawerOpen.set(false);
  }

  onOverlayClick(e: MouseEvent): void {
    if (e.target === e.currentTarget) {
      this.closeDetail();
    }
  }

  // ── Pagination & Filter Events ─────────────────────────────────────────────
  onPageChange(page: number): void {
    this.currentPage.set(page);
    this.syncQueryParams();
    this.loadUsers();
  }

  onSearchInput(q: string): void {
    this.searchQuery.set(q);
    this.currentPage.set(0);
    this.syncQueryParams();
    this.loadUsers();
  }

  onRoleChange(role: string): void {
    this.filterRole.set(role);
    this.currentPage.set(0);
    this.syncQueryParams();
    this.loadUsers();
  }

  onStatusChange(status: string): void {
    this.filterEnabled.set(status);
    this.currentPage.set(0);
    this.syncQueryParams();
    this.loadUsers();
  }

  clearFilters(): void {
    this.searchQuery.set('');
    this.filterRole.set('');
    this.filterEnabled.set('');
    this.currentPage.set(0);
    this.syncQueryParams();
    this.loadUsers();
  }

  exportCsv(): void {
    const rows = this.users();
    if (rows.length === 0) {
      this.toast.warning('No user rows available to export');
      return;
    }

    const headers = ['ID', 'Full Name', 'Email', 'Phone', 'Role', 'Status', 'Created At'];
    const lines = rows.map((u) => [
      `"${u.id}"`,
      `"${u.fullName.replace(/"/g, '""')}"`,
      `"${u.email}"`,
      `"${u.phoneNumber || ''}"`,
      `"${u.role}"`,
      `"${u.enabled ? 'ACTIVE' : 'DEACTIVATED'}"`,
      `"${u.createdAt || ''}"`
    ].join(','));

    const csvContent = [headers.join(','), ...lines].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gaming-castle-users-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    this.toast.success(`Exported ${rows.length} users to CSV`);
  }

  private syncQueryParams(): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        search: this.searchQuery() || null,
        role: this.filterRole() || null,
        status: this.filterEnabled() || null,
        page: this.currentPage() > 0 ? this.currentPage() : null
      },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }

  formatDate(isoDate?: string): string {
    if (!isoDate) return '—';
    const d = new Date(isoDate);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }
}
