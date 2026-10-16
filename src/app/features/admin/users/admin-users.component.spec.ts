import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { provideRouter, ActivatedRoute } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';
import { AdminUsersComponent } from './admin-users.component';
import { UserAdminService } from './user-admin.service';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import {
  UserSummaryResponse,
  AdminUserStatsResponse,
  PagedUsers
} from '../../../shared/models';

describe('AdminUsersComponent', () => {
  let component: AdminUsersComponent;
  let fixture: ComponentFixture<AdminUsersComponent>;
  let userAdminServiceSpy: jasmine.SpyObj<UserAdminService>;
  let toastServiceSpy: jasmine.SpyObj<ToastService>;

  const mockUsers: UserSummaryResponse[] = [
    {
      id: 'usr-01',
      email: 'player@gamingcastle.lk',
      fullName: 'Kasun Perera',
      phoneNumber: '+94771234567',
      role: 'CUSTOMER',
      enabled: true,
      createdAt: '2026-09-02T10:00:00Z'
    },
    {
      id: 'usr-02',
      email: 'admin@gamingcastle.lk',
      fullName: 'Admin User',
      phoneNumber: '+94779876543',
      role: 'ADMIN',
      enabled: true,
      createdAt: '2026-09-01T08:30:00Z'
    },
    {
      id: 'usr-03',
      email: 'dinesh@gmail.com',
      fullName: 'Dinesh Fernando',
      phoneNumber: '+94765432109',
      role: 'CUSTOMER',
      enabled: false,
      createdAt: '2026-09-12T11:45:00Z',
      deactivatedBy: 'ADMIN'
    }
  ];

  const mockPagedUsers: PagedUsers = {
    content: mockUsers,
    totalElements: 3,
    totalPages: 1,
    size: 10,
    number: 0
  };

  const mockStats: AdminUserStatsResponse = {
    totalUsers: 840,
    activeUsers: 812,
    deactivatedUsers: 28,
    customerCount: 824,
    adminCount: 16,
    newUsersToday: 6,
    newUsersThisMonth: 94
  };

  beforeEach(async () => {
    userAdminServiceSpy = jasmine.createSpyObj('UserAdminService', [
      'getUsers',
      'getUserById',
      'updateUser',
      'deactivateUser',
      'activateUser',
      'getUserStats'
    ]);

    userAdminServiceSpy.getUsers.and.returnValue(of(mockPagedUsers));
    userAdminServiceSpy.getUserStats.and.returnValue(of(mockStats));
    userAdminServiceSpy.updateUser.and.returnValue(
      of({
        id: 'usr-01',
        email: 'player@gamingcastle.lk',
        fullName: 'Kasun P. Updated',
        phoneNumber: '+94771234567',
        role: 'CUSTOMER',
        enabled: true
      })
    );
    userAdminServiceSpy.deactivateUser.and.returnValue(of(void 0));
    userAdminServiceSpy.activateUser.and.returnValue(of(void 0));

    toastServiceSpy = jasmine.createSpyObj('ToastService', ['show', 'success', 'error', 'warning', 'info']);

    await TestBed.configureTestingModule({
      imports: [AdminUsersComponent, ReactiveFormsModule],
      providers: [
        provideRouter([]),
        { provide: UserAdminService, useValue: userAdminServiceSpy },
        { provide: ToastService, useValue: toastServiceSpy },
        {
          provide: ActivatedRoute,
          useValue: {
            queryParams: of({})
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AdminUsersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('TC-FE-USR-01: should create component and initialize users and stats', () => {
    expect(component).toBeTruthy();
    expect(userAdminServiceSpy.getUsers).toHaveBeenCalled();
    expect(userAdminServiceSpy.getUserStats).toHaveBeenCalled();
    expect(component.users().length).toBe(3);
    expect(component.totalElements()).toBe(3);
    expect(component.isLoading()).toBeFalse();
  });

  it('TC-FE-USR-02: should display stat cards with correct user counts', () => {
    expect(component.stats()).toEqual(mockStats);
    expect(component.stats()?.totalUsers).toBe(840);
    expect(component.stats()?.activeUsers).toBe(812);
    expect(component.stats()?.deactivatedUsers).toBe(28);
    expect(component.stats()?.adminCount).toBe(16);
  });

  it('TC-FE-USR-03: should filter users by search query', () => {
    component.onSearchInput('Kasun');
    expect(userAdminServiceSpy.getUsers).toHaveBeenCalledWith(
      jasmine.objectContaining({ search: 'Kasun', page: 0 })
    );
  });

  it('TC-FE-USR-04: should filter users by role', () => {
    component.onRoleChange('ADMIN');
    expect(userAdminServiceSpy.getUsers).toHaveBeenCalledWith(
      jasmine.objectContaining({ role: 'ADMIN', page: 0 })
    );
  });

  it('TC-FE-USR-05: should filter users by account status', () => {
    component.onStatusChange('ACTIVE');
    expect(userAdminServiceSpy.getUsers).toHaveBeenCalledWith(
      jasmine.objectContaining({ enabled: true, page: 0 })
    );

    component.onStatusChange('DEACTIVATED');
    expect(userAdminServiceSpy.getUsers).toHaveBeenCalledWith(
      jasmine.objectContaining({ enabled: false, page: 0 })
    );
  });

  it('TC-FE-USR-06: should handle pagination page change', () => {
    component.onPageChange(2);
    expect(component.currentPage()).toBe(2);
    expect(userAdminServiceSpy.getUsers).toHaveBeenCalledWith(
      jasmine.objectContaining({ page: 2 })
    );
  });

  it('TC-FE-USR-07: should open edit modal and pre-fill form with user data', () => {
    const user = mockUsers[0];
    component.openEditModal(user);
    expect(component.editModalOpen()).toBeTrue();
    expect(component.editingUser()).toEqual(user);
    expect(component.editForm.get('fullName')?.value).toBe('Kasun Perera');
    expect(component.editForm.get('role')?.value).toBe('CUSTOMER');
    expect(component.editForm.get('enabled')?.value).toBeTrue();
  });

  it('TC-FE-USR-08: should submit user edit when valid', () => {
    component.openEditModal(mockUsers[0]);
    component.editForm.patchValue({
      fullName: 'Kasun P. Updated'
    });

    component.submitEdit();

    expect(userAdminServiceSpy.updateUser).toHaveBeenCalledWith('usr-01', {
      fullName: 'Kasun P. Updated',
      phoneNumber: '+94771234567',
      role: 'CUSTOMER',
      enabled: true
    });
    expect(toastServiceSpy.success).toHaveBeenCalledWith(jasmine.stringMatching(/updated successfully/i));
    expect(component.editModalOpen()).toBeFalse();
  });

  it('TC-FE-USR-09: should not submit invalid edit form', () => {
    component.openEditModal(mockUsers[0]);
    component.editForm.patchValue({
      fullName: '' // Invalid: required
    });

    component.submitEdit();

    expect(userAdminServiceSpy.updateUser).not.toHaveBeenCalled();
    expect(component.editForm.invalid).toBeTrue();
  });

  it('TC-FE-USR-10: should prompt toggle active and deactivate active user', () => {
    const user = mockUsers[0]; // enabled: true
    component.promptToggleActive(user);
    expect(component.toggleConfirmModalOpen()).toBeTrue();
    expect(component.targetToggleUser()).toEqual(user);

    component.confirmToggleActive();

    expect(userAdminServiceSpy.deactivateUser).toHaveBeenCalledWith('usr-01');
    expect(toastServiceSpy.success).toHaveBeenCalledWith(jasmine.stringMatching(/deactivated/i));
    expect(component.toggleConfirmModalOpen()).toBeFalse();
  });

  it('TC-FE-USR-11: should prompt toggle active and reactivate inactive user', () => {
    const user = mockUsers[2]; // enabled: false
    component.promptToggleActive(user);
    expect(component.toggleConfirmModalOpen()).toBeTrue();

    component.confirmToggleActive();

    expect(userAdminServiceSpy.activateUser).toHaveBeenCalledWith('usr-03');
    expect(toastServiceSpy.success).toHaveBeenCalledWith(jasmine.stringMatching(/reactivated/i));
  });

  it('TC-FE-USR-12: should open and close detail side drawer', () => {
    const user = mockUsers[0];
    component.openDetail(user);
    expect(component.detailDrawerOpen()).toBeTrue();
    expect(component.selectedUser()).toEqual(user);

    component.closeDetail();
    expect(component.detailDrawerOpen()).toBeFalse();
  });

  it('TC-FE-USR-13: should handle error state when loading users fails', () => {
    userAdminServiceSpy.getUsers.and.returnValue(throwError(() => new Error('Service unavailable')));

    component.loadUsers();

    expect(component.isLoading()).toBeFalse();
    expect(component.errorMessage()).toBe('Service unavailable');
    expect(toastServiceSpy.error).toHaveBeenCalled();
  });

  it('TC-FE-USR-14: should clear filters back to defaults', () => {
    component.onSearchInput('Query');
    component.onRoleChange('ADMIN');
    component.onStatusChange('DEACTIVATED');

    component.clearFilters();

    expect(component.searchQuery()).toBe('');
    expect(component.filterRole()).toBe('');
    expect(component.filterEnabled()).toBe('');
    expect(component.currentPage()).toBe(0);
  });

  it('TC-FE-USR-15: should export users list to CSV', () => {
    spyOn(document, 'createElement').and.callThrough();
    component.exportCsv();
    expect(toastServiceSpy.success).toHaveBeenCalledWith(jasmine.stringMatching(/Exported 3 users/i));
  });
});
