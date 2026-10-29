import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { NotificationSocketService } from './notification-socket.service';
import { ToastService } from '../../shared/ui/toast/toast.service';
import { AuthService } from './auth.service';
import { AdminNotification } from '../../shared/models/notification.model';

describe('NotificationSocketService', () => {
  let service: NotificationSocketService;
  let httpMock: HttpTestingController;
  let toastSpy: jasmine.SpyObj<ToastService>;
  let authSpy: jasmine.SpyObj<AuthService>;

  beforeEach(() => {
    toastSpy = jasmine.createSpyObj('ToastService', ['success', 'info', 'error', 'warning']);
    authSpy = jasmine.createSpyObj('AuthService', ['getUserId', 'role', 'currentUser', 'isCustomer', 'isAdmin']);

    authSpy.getUserId.and.returnValue('cust-001');
    authSpy.role.and.returnValue('CUSTOMER');
    authSpy.currentUser.and.returnValue({
      sub: 'cust-001',
      userId: 'cust-001',
      email: 'customer@test.com',
      role: 'CUSTOMER',
      iat: 1234567,
      exp: 9999999
    });
    authSpy.isCustomer.and.returnValue(true);
    authSpy.isAdmin.and.returnValue(false);

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ToastService, useValue: toastSpy },
        { provide: AuthService, useValue: authSpy }
      ]
    });

    httpMock = TestBed.inject(HttpTestingController);
    service = TestBed.inject(NotificationSocketService);

    // Handle initial fetch GET request (may have query parameters)
    const initReq = httpMock.match(req => req.url.includes('/api/notifications'));
    if (initReq.length > 0) {
      initReq[0].flush({
        notifications: [
          {
            id: 'n-1',
            type: 'BOOKING_CREATED',
            category: 'BOOKING',
            title: 'Station PS5 Reserved',
            message: 'Booked for 2 hours',
            link: '/bookings',
            read: false,
            createdAt: new Date().toISOString()
          },
          {
            id: 'n-2',
            type: 'TOURNAMENT_REGISTRATION',
            category: 'TOURNAMENT',
            title: 'Tournament Enrolled',
            message: 'Tekken 8 Arena',
            link: '/tournaments',
            read: true,
            createdAt: new Date().toISOString()
          }
        ],
        unreadCount: 1
      });
    }
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created and hold initial state', () => {
    expect(service).toBeTruthy();
    expect(service.isDrawerOpen()).toBeFalse();
    expect(service.activeFilter()).toBe('ALL');
  });

  it('should toggle drawer state', () => {
    expect(service.isDrawerOpen()).toBeFalse();
    service.toggleDrawer();
    expect(service.isDrawerOpen()).toBeTrue();
    service.toggleDrawer();
    expect(service.isDrawerOpen()).toBeFalse();
  });

  it('should open and close drawer explicitly', () => {
    service.openDrawer();
    expect(service.isDrawerOpen()).toBeTrue();
    service.closeDrawer();
    expect(service.isDrawerOpen()).toBeFalse();
  });

  it('should update activeFilter and filter computed notifications', () => {
    service.setFilter('UNREAD');
    expect(service.activeFilter()).toBe('UNREAD');
    expect(service.filteredNotifications().every(n => !n.read)).toBeTrue();

    service.setFilter('BOOKING');
    expect(service.activeFilter()).toBe('BOOKING');
    expect(service.filteredNotifications().every(n => n.category === 'BOOKING' || n.category === 'RESCHEDULE' || n.category === 'CANCEL')).toBeTrue();

    service.setFilter('TOURNAMENT');
    expect(service.activeFilter()).toBe('TOURNAMENT');
    expect(service.filteredNotifications().every(n => n.category === 'TOURNAMENT')).toBeTrue();

    service.setFilter('ALL');
    expect(service.activeFilter()).toBe('ALL');
    expect(service.filteredNotifications().length).toBe(service.notifications().length);
  });

  it('should optimistically mark a notification as read and decrement unreadCount', () => {
    service.markAsRead('n-1');
    const target = service.notifications().find(n => n.id === 'n-1');
    expect(target?.read).toBeTrue();
    expect(service.unreadCount()).toBe(0);

    const patchReq = httpMock.expectOne(req => req.url.includes('/api/notifications/n-1/read'));
    expect(patchReq.request.method).toBe('PATCH');
    expect(patchReq.request.body).toEqual({ userId: 'cust-001', role: 'CUSTOMER' });
    patchReq.flush({ success: true });
  });

  it('should mark all notifications as read and set unreadCount to 0', () => {
    service.markAllAsRead();
    expect(service.notifications().every(n => n.read)).toBeTrue();
    expect(service.unreadCount()).toBe(0);

    const postReq = httpMock.expectOne(req => req.url.includes('/api/notifications/mark-all-read'));
    expect(postReq.request.method).toBe('POST');
    expect(postReq.request.body).toEqual({ userId: 'cust-001', role: 'CUSTOMER' });
    postReq.flush({ success: true, unreadCount: 0 });
  });

  it('should remove a single notification', () => {
    const initialCount = service.notifications().length;
    service.removeNotification('n-2');
    expect(service.notifications().length).toBe(initialCount - 1);

    const delReq = httpMock.expectOne('/realtime/api/notifications/n-2');
    expect(delReq.request.method).toBe('DELETE');
    delReq.flush({ success: true, unreadCount: 1 });
  });

  it('should clear all notifications', () => {
    service.clearAll();
    expect(service.notifications().length).toBe(0);
    expect(service.unreadCount()).toBe(0);

    const delReq = httpMock.expectOne('/realtime/api/notifications');
    expect(delReq.request.method).toBe('DELETE');
    delReq.flush({ success: true });
  });

  it('should send notification and automatically attach customer targetUserId', () => {
    const payload = {
      type: 'BOOKING_CONFIRMED',
      category: 'BOOKING' as const,
      title: 'Booking Confirmed!',
      message: 'Station PC-02 booked',
      link: '/bookings'
    };

    service.sendNotification(payload);

    const postReq = httpMock.expectOne('/realtime/api/notify');
    expect(postReq.request.method).toBe('POST');
    expect(postReq.request.body.targetUserId).toBe('cust-001');

    const createdNotif: AdminNotification = {
      id: 'notif-test-123',
      ...payload,
      targetUserId: 'cust-001',
      read: false,
      createdAt: new Date().toISOString()
    };

    postReq.flush({
      success: true,
      notification: createdNotif,
      unreadCount: 2
    });

    expect(service.notifications().some(n => n.id === 'notif-test-123')).toBeTrue();
  });

  it('should trigger sendCustomerTestAlert when sendTestAlert(true) is invoked with targetUserId', () => {
    spyOn(service, 'sendCustomerTestAlert').and.callThrough();
    service.sendTestAlert(true);
    expect(service.sendCustomerTestAlert).toHaveBeenCalled();

    const postReq = httpMock.expectOne('/realtime/api/notify');
    expect(postReq.request.method).toBe('POST');
    expect(postReq.request.body.targetUserId).toBe('cust-001');
    postReq.flush({
      success: true,
      notification: {
        id: 'notif-test-123',
        type: 'BOOKING_CONFIRMED',
        category: 'BOOKING',
        title: 'Booking Confirmed!',
        message: 'Station PC-02 booked',
        link: '/bookings',
        targetUserId: 'cust-001',
        read: false,
        createdAt: new Date().toISOString()
      } satisfies AdminNotification,
      unreadCount: 1
    });
  });

  describe('Real-Time Slot Soft-Locking', () => {
    let mockSocket: {
      connected: boolean;
      emit: jasmine.Spy;
      on: jasmine.Spy;
    };

    beforeEach(() => {
      mockSocket = {
        connected: true,
        emit: jasmine.createSpy('emit'),
        on: jasmine.createSpy('on')
      };
      (service as unknown as { socket: unknown }).socket = mockSocket;
    });

    it('should emit lock_slot when socket is connected', () => {
      service.lockSlot('st-01', '2026-11-04', '10:00');
      expect(mockSocket.emit).toHaveBeenCalledWith('lock_slot', jasmine.objectContaining({
        stationId: 'st-01',
        date: '2026-11-04',
        timeSlot: '10:00'
      }));
    });

    it('should not emit lock_slot when socket is disconnected', () => {
      mockSocket.connected = false;
      service.lockSlot('st-01', '2026-11-04', '10:00');
      expect(mockSocket.emit).not.toHaveBeenCalled();
    });

    it('should emit unlock_slot when socket is connected', () => {
      service.unlockSlot('st-01', '2026-11-04', '10:00');
      expect(mockSocket.emit).toHaveBeenCalledWith('unlock_slot', {
        stationId: 'st-01',
        date: '2026-11-04',
        timeSlot: '10:00'
      });
    });

    it('should emit booking_confirmed_slot when socket is connected', () => {
      service.confirmSlotBooked('st-01', '2026-11-04', '10:00');
      expect(mockSocket.emit).toHaveBeenCalledWith('booking_confirmed_slot', {
        stationId: 'st-01',
        date: '2026-11-04',
        timeSlot: '10:00'
      });
    });

    it('should correctly identify if slot is held by another user', () => {
      const now = Date.now();
      service.activeSlotLocks.set([
        {
          key: 'st-01_2026-11-04_10:00',
          stationId: 'st-01',
          date: '2026-11-04',
          timeSlot: '10:00',
          userId: 'other-user',
          expiresAt: now + 60000
        },
        {
          key: 'st-01_2026-11-04_11:00',
          stationId: 'st-01',
          date: '2026-11-04',
          timeSlot: '11:00',
          userId: 'cust-001', // current user
          expiresAt: now + 60000
        },
        {
          key: 'st-01_2026-11-04_12:00',
          stationId: 'st-01',
          date: '2026-11-04',
          timeSlot: '12:00',
          userId: 'other-user',
          expiresAt: now - 1000 // expired
        }
      ]);

      // Held by other and unexpired -> true
      expect(service.isSlotHeldByOther('st-01', '2026-11-04', '10:00')).toBeTrue();
      // Held by current user -> false
      expect(service.isSlotHeldByOther('st-01', '2026-11-04', '11:00')).toBeFalse();
      // Expired lock -> false
      expect(service.isSlotHeldByOther('st-01', '2026-11-04', '12:00')).toBeFalse();
      // Other unbooked 1-hour slot on same station -> false (available!)
      expect(service.isSlotHeldByOther('st-01', '2026-11-04', '13:00')).toBeFalse();
      expect(service.isSlotHeldByOther('st-01', '2026-11-04', '14:00')).toBeFalse();
      // Normalized 12h format of the locked slot matches
      expect(service.isSlotHeldByOther('st-01', '2026-11-04', '10:00 AM')).toBeTrue();
      // Same time slot on a different station -> false (available!)
      expect(service.isSlotHeldByOther('st-02', '2026-11-04', '10:00')).toBeFalse();
    });
  });
});

