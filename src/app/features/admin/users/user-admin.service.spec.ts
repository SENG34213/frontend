import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { UserAdminService } from './user-admin.service';
import { ApiService } from '../../../core/services/api.service';
import { UserSummaryResponse, AdminUserStatsResponse, UserFilter } from '../../../shared/models';

describe('UserAdminService', () => {
  let service: UserAdminService;
  let apiSpy: jasmine.SpyObj<ApiService>;

  const mockUser: UserSummaryResponse = {
    id: 'usr-1',
    email: 'kasun@test.lk',
    fullName: 'Kasun Perera',
    role: 'CUSTOMER',
    enabled: true,
    createdAt: '2026-10-19T00:00:00Z'
  };

  beforeEach(() => {
    apiSpy = jasmine.createSpyObj('ApiService', ['get', 'put', 'patch']);
    TestBed.configureTestingModule({
      providers: [
        UserAdminService,
        { provide: ApiService, useValue: apiSpy }
      ]
    });
    service = TestBed.inject(UserAdminService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should get users with filters', (done) => {
    const filter: UserFilter = {
      page: 0,
      size: 10,
      search: 'kasun',
      role: 'CUSTOMER',
      enabled: true,
      sort: 'createdAt,desc'
    };

    apiSpy.get.and.returnValue(of({
      content: [mockUser],
      totalElements: 1,
      totalPages: 1,
      number: 0,
      size: 10
    }));

    service.getUsers(filter).subscribe(res => {
      expect(res.content.length).toBe(1);
      expect(apiSpy.get).toHaveBeenCalledWith('/users', jasmine.any(Object));
      done();
    });
  });

  it('should get user by ID', (done) => {
    apiSpy.get.and.returnValue(of(mockUser));

    service.getUserById('usr-1').subscribe(res => {
      expect(res.id).toBe('usr-1');
      expect(apiSpy.get).toHaveBeenCalledWith('/users/usr-1');
      done();
    });
  });

  it('should update user via PUT', (done) => {
    apiSpy.put.and.returnValue(of({ ...mockUser, fullName: 'Kasun Updated' }));

    service.updateUser('usr-1', { fullName: 'Kasun Updated' }).subscribe(res => {
      expect(res.fullName).toBe('Kasun Updated');
      expect(apiSpy.put).toHaveBeenCalledWith('/users/usr-1', { fullName: 'Kasun Updated' });
      done();
    });
  });

  it('should deactivate user via PATCH', (done) => {
    apiSpy.patch.and.returnValue(of(undefined));

    service.deactivateUser('usr-1').subscribe(() => {
      expect(apiSpy.patch).toHaveBeenCalledWith('/users/usr-1/deactivate', {});
      done();
    });
  });

  it('should activate user via PATCH', (done) => {
    apiSpy.patch.and.returnValue(of(undefined));

    service.activateUser('usr-1').subscribe(() => {
      expect(apiSpy.patch).toHaveBeenCalledWith('/users/usr-1/activate', {});
      done();
    });
  });

  it('should get user stats via GET', (done) => {
    const mockStats: AdminUserStatsResponse = {
      totalUsers: 100,
      activeUsers: 90,
      deactivatedUsers: 10,
      customerCount: 95,
      adminCount: 5,
      newUsersToday: 3,
      newUsersThisMonth: 20
    };

    apiSpy.get.and.returnValue(of(mockStats));

    service.getUserStats().subscribe(stats => {
      expect(stats.totalUsers).toBe(100);
      expect(apiSpy.get).toHaveBeenCalledWith('/users/admin/stats');
      done();
    });
  });
});
