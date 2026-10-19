import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { NotificationSocketService } from './notification-socket.service';
import { ToastService } from '../../shared/ui/toast/toast.service';
import { AdminNotification } from '../../shared/models/notification.model';

describe('NotificationSocketService', () => {
  let service: NotificationSocketService;
  let httpMock: HttpTestingController;
  let toastSpy: jasmine.SpyObj<ToastService>;

  beforeEach(() => {
    toastSpy = jasmine.createSpyObj('ToastService', ['success', 'info', 'error', 'warning']);

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ToastService, useValue: toastSpy }
      ]
    });

    httpMock = TestBed.inject(HttpTestingController);
    service = TestBed.inject(NotificationSocketService);

    // Handle initial fetch GET request
    const initReq = httpMock.match('http://localhost:5001/api/notifications');
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

    const patchReq = httpMock.expectOne('http://localhost:5001/api/notifications/n-1/read');
    expect(patchReq.request.method).toBe('PATCH');
    patchReq.flush({ success: true });
  });

  it('should mark all notifications as read and set unreadCount to 0', () => {
    service.markAllAsRead();
    expect(service.notifications().every(n => n.read)).toBeTrue();
    expect(service.unreadCount()).toBe(0);

    const postReq = httpMock.expectOne('http://localhost:5001/api/notifications/mark-all-read');
    expect(postReq.request.method).toBe('POST');
    postReq.flush({ success: true, unreadCount: 0 });
  });

  it('should remove a single notification', () => {
    const initialCount = service.notifications().length;
    service.removeNotification('n-2');
    expect(service.notifications().length).toBe(initialCount - 1);

    const delReq = httpMock.expectOne('http://localhost:5001/api/notifications/n-2');
    expect(delReq.request.method).toBe('DELETE');
    delReq.flush({ success: true, unreadCount: 1 });
  });

  it('should clear all notifications', () => {
    service.clearAll();
    expect(service.notifications().length).toBe(0);
    expect(service.unreadCount()).toBe(0);

    const delReq = httpMock.expectOne('http://localhost:5001/api/notifications');
    expect(delReq.request.method).toBe('DELETE');
    delReq.flush({ success: true });
  });

  it('should send notification and update state on HTTP success', () => {
    const payload = {
      type: 'BOOKING_CONFIRMED',
      category: 'BOOKING' as const,
      title: 'Booking Confirmed!',
      message: 'Station PC-02 booked',
      link: '/bookings'
    };

    service.sendNotification(payload);

    const postReq = httpMock.expectOne('http://localhost:5001/api/notify');
    expect(postReq.request.method).toBe('POST');

    const createdNotif: AdminNotification = {
      id: 'notif-test-123',
      ...payload,
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

  it('should trigger sendCustomerTestAlert when sendTestAlert(true) is invoked', () => {
    spyOn(service, 'sendCustomerTestAlert').and.callThrough();
    service.sendTestAlert(true);
    expect(service.sendCustomerTestAlert).toHaveBeenCalled();

    const postReq = httpMock.expectOne('http://localhost:5001/api/notify');
    expect(postReq.request.method).toBe('POST');
    postReq.flush({ success: true, notification: {} as unknown as AdminNotification, unreadCount: 1 });
  });
});
