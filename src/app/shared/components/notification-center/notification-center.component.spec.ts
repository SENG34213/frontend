import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { NotificationCenterComponent } from './notification-center.component';
import { NotificationSocketService } from '../../../core/services/notification-socket.service';
import { AdminNotification } from '../../models/notification.model';

describe('NotificationCenterComponent', () => {
  let component: NotificationCenterComponent;
  let fixture: ComponentFixture<NotificationCenterComponent>;
  let notifSocketSpy: jasmine.SpyObj<NotificationSocketService>;

  const mockNotifications: AdminNotification[] = [
    {
      id: 'notif-1',
      type: 'BOOKING_CREATED',
      category: 'BOOKING',
      title: 'Booking Confirmed!',
      message: 'Station PS5-01 reserved for 2 hours',
      link: '/admin/bookings',
      read: false,
      createdAt: new Date(Date.now() - 5 * 60000).toISOString()
    },
    {
      id: 'notif-2',
      type: 'TOURNAMENT_REGISTRATION',
      category: 'TOURNAMENT',
      title: 'Tournament Enrolled!',
      message: 'You have entered Tekken 8 Arena',
      link: '/admin/tournaments',
      read: true,
      createdAt: new Date(Date.now() - 120 * 60000).toISOString()
    }
  ];

  beforeEach(async () => {
    notifSocketSpy = jasmine.createSpyObj('NotificationSocketService', [
      'toggleDrawer',
      'openDrawer',
      'closeDrawer',
      'setFilter',
      'markAsRead',
      'markAllAsRead',
      'removeNotification',
      'clearAll',
      'sendTestAlert',
      'sendCustomerTestAlert',
      'sendNotification'
    ], {
      notifications: signal<AdminNotification[]>(mockNotifications),
      filteredNotifications: signal<AdminNotification[]>(mockNotifications),
      unreadCount: signal<number>(1),
      isConnected: signal<boolean>(true),
      isDrawerOpen: signal<boolean>(false),
      activeFilter: signal<'ALL' | 'UNREAD' | 'BOOKING' | 'TOURNAMENT'>('ALL')
    });

    await TestBed.configureTestingModule({
      imports: [NotificationCenterComponent],
      providers: [
        provideRouter([]),
        { provide: NotificationSocketService, useValue: notifSocketSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(NotificationCenterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create NotificationCenterComponent', () => {
    expect(component).toBeTruthy();
    expect(component.mode).toBe('customer');
    expect(component.showFloatingTrigger).toBeTrue();
  });

  it('should toggle drawer when floating trigger button is clicked', () => {
    const triggerBtn = fixture.nativeElement.querySelector('.notification-trigger-btn');
    expect(triggerBtn).toBeTruthy();
    triggerBtn.click();
    expect(notifSocketSpy.toggleDrawer).toHaveBeenCalled();
  });

  it('should display unread badge when unreadCount > 0', () => {
    const badge = fixture.nativeElement.querySelector('.unread-badge');
    expect(badge).toBeTruthy();
    expect(badge.textContent.trim()).toBe('1');
  });

  it('should open notification panel when isDrawerOpen is true', () => {
    (notifSocketSpy.isDrawerOpen as unknown as ReturnType<typeof signal<boolean>>).set(true);
    fixture.detectChanges();

    const panel = fixture.nativeElement.querySelector('.notification-panel');
    expect(panel).toBeTruthy();
  });

  it('should close drawer when close button is clicked in panel header', () => {
    (notifSocketSpy.isDrawerOpen as unknown as ReturnType<typeof signal<boolean>>).set(true);
    fixture.detectChanges();

    const closeBtn = fixture.nativeElement.querySelector('.btn-close');
    expect(closeBtn).toBeTruthy();
    closeBtn.click();
    expect(notifSocketSpy.closeDrawer).toHaveBeenCalled();
  });

  it('should map category icons correctly', () => {
    expect(component.getCategoryIcon('BOOKING')).toBe('🎮');
    expect(component.getCategoryIcon('TOURNAMENT')).toBe('🏆');
    expect(component.getCategoryIcon('CANCEL')).toBe('🚫');
    expect(component.getCategoryIcon('RESCHEDULE')).toBe('🔄');
    expect(component.getCategoryIcon('PAYMENT')).toBe('💳');
    expect(component.getCategoryIcon('SYSTEM')).toBe('⚡');
  });

  it('should map category badge classes correctly', () => {
    expect(component.getCategoryBadgeClass('BOOKING')).toBe('badge-booking');
    expect(component.getCategoryBadgeClass('TOURNAMENT')).toBe('badge-tournament');
    expect(component.getCategoryBadgeClass('CANCEL')).toBe('badge-cancel');
    expect(component.getCategoryBadgeClass('RESCHEDULE')).toBe('badge-reschedule');
    expect(component.getCategoryBadgeClass('PAYMENT')).toBe('badge-payment');
    expect(component.getCategoryBadgeClass('SYSTEM')).toBe('badge-system');
  });

  it('should format relative time correctly', () => {
    expect(component.getTimeAgo('')).toBe('Just now');
    const justNow = new Date(Date.now() - 10000).toISOString();
    expect(component.getTimeAgo(justNow)).toBe('Just now');
    const minsAgo = new Date(Date.now() - 15 * 60000).toISOString();
    expect(component.getTimeAgo(minsAgo)).toBe('15m ago');
    const hoursAgo = new Date(Date.now() - 3 * 3600000).toISOString();
    expect(component.getTimeAgo(hoursAgo)).toBe('3h ago');
    const daysAgo = new Date(Date.now() - 2 * 86400000).toISOString();
    expect(component.getTimeAgo(daysAgo)).toBe('2d ago');
  });

  it('should resolve customer links properly in customer mode', () => {
    component.mode = 'customer';
    expect(component.getNotificationLink({ link: '/admin/bookings' } as unknown as AdminNotification)).toBe('/bookings');
    expect(component.getNotificationLink({ link: '/admin/tournaments' } as unknown as AdminNotification)).toBe('/tournaments');
    expect(component.getNotificationLink({ link: '/admin' } as unknown as AdminNotification)).toBe('/dashboard');
    expect(component.getNotificationLink({ link: '/tournaments/t-101' } as unknown as AdminNotification)).toBe('/tournaments/t-101');
    expect(component.getNotificationLink({} as unknown as AdminNotification)).toBe('/dashboard');
  });

  it('should resolve admin links in admin mode', () => {
    component.mode = 'admin';
    expect(component.getNotificationLink({ link: '/admin/bookings' } as unknown as AdminNotification)).toBe('/admin/bookings');
    expect(component.getNotificationLink({} as unknown as AdminNotification)).toBe('/admin');
  });

  it('should call sendTestAlert with true when mode is customer', () => {
    component.mode = 'customer';
    component.onTestAlert();
    expect(notifSocketSpy.sendTestAlert).toHaveBeenCalledWith(true);
  });

  it('should call sendTestAlert with false when mode is admin', () => {
    component.mode = 'admin';
    component.onTestAlert();
    expect(notifSocketSpy.sendTestAlert).toHaveBeenCalledWith(false);
  });

  it('should call markAllAsRead when Read All button is clicked', () => {
    (notifSocketSpy.isDrawerOpen as unknown as ReturnType<typeof signal<boolean>>).set(true);
    fixture.detectChanges();

    const readAllBtn = fixture.nativeElement.querySelector('.btn-text-action');
    expect(readAllBtn).toBeTruthy();
    readAllBtn.click();
    expect(notifSocketSpy.markAllAsRead).toHaveBeenCalled();
  });

  it('should render empty state when filteredNotifications is empty', () => {
    (notifSocketSpy.isDrawerOpen as unknown as ReturnType<typeof signal<boolean>>).set(true);
    (notifSocketSpy.filteredNotifications as unknown as ReturnType<typeof signal<AdminNotification[]>>).set([]);
    fixture.detectChanges();

    const emptyDesc = fixture.nativeElement.querySelector('.empty-desc');
    expect(emptyDesc).toBeTruthy();
  });
});
