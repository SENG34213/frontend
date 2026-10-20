import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { UserService } from './user.service';
import { ApiService } from './api.service';
import { MockDataService } from './mock/mock-data.service';
import { AuthService } from './auth.service';
import { UserProfile } from '../../shared/models/user.model';
import { environment } from '../../../environments/environment';

describe('UserService', () => {
  let service: UserService;
  let apiSpy: jasmine.SpyObj<ApiService>;
  let mockDataSpy: jasmine.SpyObj<MockDataService>;
  let authSpy: jasmine.SpyObj<AuthService>;

  const mockProfile: UserProfile = {
    id: 'usr-1',
    email: 'player@gamingcastle.lk',
    fullName: 'Kasun Perera',
    phoneNumber: '+94771234567',
    role: 'CUSTOMER',
    enabled: true,
    createdAt: '2026-09-02T10:00:00Z'
  };

  beforeEach(() => {
    apiSpy = jasmine.createSpyObj('ApiService', ['get']);
    mockDataSpy = jasmine.createSpyObj('MockDataService', ['getUserProfile']);
    authSpy = jasmine.createSpyObj('AuthService', ['currentUser'], {
      currentUser: jasmine.createSpy('currentUser').and.returnValue({
        userId: 'usr-1',
        email: 'player@gamingcastle.lk',
        sub: 'usr-1',
        role: 'CUSTOMER',
        iat: 0,
        exp: 9999999999
      })
    });

    TestBed.configureTestingModule({
      providers: [
        UserService,
        { provide: ApiService, useValue: apiSpy },
        { provide: MockDataService, useValue: mockDataSpy },
        { provide: AuthService, useValue: authSpy }
      ]
    });

    service = TestBed.inject(UserService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
    expect(service.currentProfile()).toBeNull();
  });

  describe('getMyProfile()', () => {
    it('should call api.get when useMocks is false and cache profile', (done) => {
      const orig = environment.useMocks;
      environment.useMocks = false;
      apiSpy.get.and.returnValue(of(mockProfile));

      service.getMyProfile().subscribe((p) => {
        expect(apiSpy.get).toHaveBeenCalledWith('/users/me');
        expect(p).toEqual(mockProfile);
        expect(service.currentProfile()).toEqual(mockProfile);
        environment.useMocks = orig;
        done();
      });
    });

    it('should return cached profile when available and forceRefresh is false', (done) => {
      service.currentProfile.set(mockProfile);

      service.getMyProfile(false).subscribe((p) => {
        expect(apiSpy.get).not.toHaveBeenCalled();
        expect(p).toEqual(mockProfile);
        done();
      });
    });

    it('should refetch when forceRefresh is true even if cached', (done) => {
      const orig = environment.useMocks;
      environment.useMocks = false;
      service.currentProfile.set(mockProfile);
      apiSpy.get.and.returnValue(of(mockProfile));

      service.getMyProfile(true).subscribe((p) => {
        expect(apiSpy.get).toHaveBeenCalledWith('/users/me');
        expect(p).toEqual(mockProfile);
        environment.useMocks = orig;
        done();
      });
    });

    it('should fallback to mockData when api.get fails', (done) => {
      const orig = environment.useMocks;
      environment.useMocks = false;
      apiSpy.get.and.returnValue(throwError(() => new Error('API error')));
      mockDataSpy.getUserProfile.and.returnValue(of(mockProfile));

      service.getMyProfile().subscribe((p) => {
        expect(mockDataSpy.getUserProfile).toHaveBeenCalledWith('usr-1');
        expect(p).toEqual(mockProfile);
        environment.useMocks = orig;
        done();
      });
    });

    it('should call mockData when useMocks is true', (done) => {
      const orig = environment.useMocks;
      environment.useMocks = true;
      mockDataSpy.getUserProfile.and.returnValue(of(mockProfile));

      service.getMyProfile().subscribe((p) => {
        expect(mockDataSpy.getUserProfile).toHaveBeenCalledWith('usr-1');
        expect(p).toEqual(mockProfile);
        environment.useMocks = orig;
        done();
      });
    });
  });

  describe('clearCachedProfile()', () => {
    it('should set currentProfile to null', () => {
      service.currentProfile.set(mockProfile);
      service.clearCachedProfile();
      expect(service.currentProfile()).toBeNull();
    });
  });
});
