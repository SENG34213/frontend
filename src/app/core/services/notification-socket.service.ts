import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { io, Socket } from 'socket.io-client';
import { AdminNotification, NotificationPayload, NotificationCategory } from '../../shared/models/notification.model';
import { ToastService } from '../../shared/ui/toast/toast.service';

@Injectable({
  providedIn: 'root'
})
export class NotificationSocketService {
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);

  private readonly socketUrl = 'http://localhost:5001';
  private socket: Socket | null = null;
  private audioCtx: AudioContext | null = null;

  // ── Signals ────────────────────────────────────────────────────────────────
  readonly notifications = signal<AdminNotification[]>([]);
  readonly unreadCount = signal<number>(0);
  readonly isConnected = signal<boolean>(false);
  readonly isDrawerOpen = signal<boolean>(false);
  readonly activeFilter = signal<'ALL' | 'UNREAD' | 'BOOKING' | 'TOURNAMENT'>('ALL');

  // Computed filtered list
  readonly filteredNotifications = computed(() => {
    const list = this.notifications();
    const filter = this.activeFilter();

    switch (filter) {
      case 'UNREAD':
        return list.filter(n => !n.read);
      case 'BOOKING':
        return list.filter(n => n.category === 'BOOKING' || n.category === 'RESCHEDULE' || n.category === 'CANCEL');
      case 'TOURNAMENT':
        return list.filter(n => n.category === 'TOURNAMENT');
      default:
        return list;
    }
  });

  constructor() {
    this.initSocket();
    this.fetchInitialNotifications();
  }

  // ── Socket.IO Connection ───────────────────────────────────────────────────
  private initSocket(): void {
    try {
      this.socket = io(this.socketUrl, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 2000,
        timeout: 5000
      });

      this.socket.on('connect', () => {
        console.log('[NotificationSocket] Connected to Socket.IO server at', this.socketUrl);
        this.isConnected.set(true);
      });

      this.socket.on('disconnect', (reason) => {
        console.warn('[NotificationSocket] Disconnected from server:', reason);
        this.isConnected.set(false);
      });

      this.socket.on('init', (data: { notifications: AdminNotification[]; unreadCount: number }) => {
        if (data) {
          this.notifications.set(data.notifications || []);
          this.unreadCount.set(data.unreadCount || 0);
        }
      });

      this.socket.on('notification', (newNotif: AdminNotification) => {
        console.log('[NotificationSocket] Received real-time notification:', newNotif);

        // Update list
        this.notifications.update(prev => [newNotif, ...prev.filter(n => n.id !== newNotif.id)]);

        // Play chime audio
        this.playNotificationSound();

        // Show floating toast alert
        this.showToastAlert(newNotif);
      });

      this.socket.on('unread_count', (count: number) => {
        this.unreadCount.set(count);
      });

      this.socket.on('notification_read', (data: { id: string; unreadCount: number }) => {
        this.notifications.update(list =>
          list.map(n => n.id === data.id ? { ...n, read: true } : n)
        );
        this.unreadCount.set(data.unreadCount);
      });

      this.socket.on('all_read', () => {
        this.notifications.update(list => list.map(n => ({ ...n, read: true })));
        this.unreadCount.set(0);
      });

      this.socket.on('notifications_cleared', () => {
        this.notifications.set([]);
        this.unreadCount.set(0);
      });

    } catch (err) {
      console.error('[NotificationSocket] Socket initialization error:', err);
      this.isConnected.set(false);
    }
  }

  private fetchInitialNotifications(): void {
    this.http.get<{ notifications: AdminNotification[]; unreadCount: number }>(`${this.socketUrl}/api/notifications`).subscribe({
      next: (res) => {
        if (res && res.notifications) {
          this.notifications.set(res.notifications);
          this.unreadCount.set(res.unreadCount);
        }
      },
      error: () => {
        // Fallback: If socket server is not yet running, prefill mock data
        if (this.notifications().length === 0) {
          this.notifications.set([
            {
              id: 'local-1',
              type: 'BOOKING_CREATED',
              category: 'BOOKING',
              title: 'New Walk-In Booking',
              message: 'Station PS5-02 booked for 2 hours (LKR 1,600.00)',
              link: '/admin/bookings',
              read: false,
              createdAt: new Date(Date.now() - 3 * 60000).toISOString()
            },
            {
              id: 'local-2',
              type: 'TOURNAMENT_REGISTRATION',
              category: 'TOURNAMENT',
              title: 'Tournament Enrollment',
              message: 'Alex Silva enrolled in EA FC 25 Championship Arena',
              link: '/admin/tournaments',
              read: false,
              createdAt: new Date(Date.now() - 15 * 60000).toISOString()
            }
          ]);
          this.unreadCount.set(2);
        }
      }
    });
  }

  // ── Actions ────────────────────────────────────────────────────────────────
  toggleDrawer(): void {
    this.isDrawerOpen.update(v => !v);
  }

  openDrawer(): void {
    this.isDrawerOpen.set(true);
  }

  closeDrawer(): void {
    this.isDrawerOpen.set(false);
  }

  setFilter(filter: 'ALL' | 'UNREAD' | 'BOOKING' | 'TOURNAMENT'): void {
    this.activeFilter.set(filter);
  }

  markAsRead(id: string): void {
    // Optimistic local update
    this.notifications.update(list =>
      list.map(n => n.id === id ? { ...n, read: true } : n)
    );
    const newUnread = this.notifications().filter(n => !n.read).length;
    this.unreadCount.set(newUnread);

    if (this.socket && this.socket.connected) {
      this.socket.emit('mark_read', id);
    }
    this.http.patch(`${this.socketUrl}/api/notifications/${id}/read`, {}).subscribe({ error: () => {} });
  }

  markAllAsRead(): void {
    this.notifications.update(list => list.map(n => ({ ...n, read: true })));
    this.unreadCount.set(0);

    if (this.socket && this.socket.connected) {
      this.socket.emit('mark_all_read');
    }
    this.http.post(`${this.socketUrl}/api/notifications/mark-all-read`, {}).subscribe({ error: () => {} });
  }

  removeNotification(id: string): void {
    this.notifications.update(list => list.filter(n => n.id !== id));
    this.unreadCount.set(this.notifications().filter(n => !n.read).length);

    this.http.delete(`${this.socketUrl}/api/notifications/${id}`).subscribe({ error: () => {} });
  }

  clearAll(): void {
    this.notifications.set([]);
    this.unreadCount.set(0);

    this.http.delete(`${this.socketUrl}/api/notifications`).subscribe({ error: () => {} });
  }

  // ── Send Notification from Frontend or Testing ─────────────────────────────
  sendNotification(payload: NotificationPayload): void {
    const body = {
      ...payload,
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`
    };

    this.http.post<{ success: boolean; notification: AdminNotification; unreadCount: number }>(
      `${this.socketUrl}/api/notify`,
      body
    ).subscribe({
      next: (res) => {
        if (!this.isConnected()) {
          // If socket not connected, manually insert
          this.notifications.update(prev => [res.notification, ...prev]);
          this.unreadCount.update(c => c + 1);
          this.playNotificationSound();
          this.showToastAlert(res.notification);
        }
      },
      error: () => {
        // Fallback local broadcast
        const category = body.category || this.deriveCategory(body.type);
        const localNotif: AdminNotification = {
          ...body,
          category,
          read: false,
          createdAt: new Date().toISOString()
        };
        this.notifications.update(prev => [localNotif, ...prev]);
        this.unreadCount.update(c => c + 1);
        this.playNotificationSound();
        this.showToastAlert(localNotif);
      }
    });
  }

  private deriveCategory(type: string): NotificationCategory {
    const t = (type || '').toUpperCase();
    if (t.includes('CANCEL')) return 'CANCEL';
    if (t.includes('RESCHEDULE')) return 'RESCHEDULE';
    if (t.includes('BOOKING') || t.includes('SLOT')) return 'BOOKING';
    if (t.includes('TOURNAMENT') || t.includes('MATCH')) return 'TOURNAMENT';
    if (t.includes('PAYMENT') || t.includes('LOYALTY') || t.includes('XP') || t.includes('POINTS')) return 'PAYMENT';
    return 'SYSTEM';
  }

  sendTestAlert(isCustomer = false): void {
    if (isCustomer) {
      this.sendCustomerTestAlert();
      return;
    }

    const types: NotificationPayload[] = [
      {
        type: 'BOOKING_CREATED',
        category: 'BOOKING',
        title: 'New Booking Slot Reserved',
        message: 'Station PS5-03 reserved for 2 hours (LKR 1,800.00)',
        link: '/admin/bookings'
      },
      {
        type: 'TOURNAMENT_REGISTRATION',
        category: 'TOURNAMENT',
        title: 'Tournament Registration',
        message: 'Player enrolled in Tekken 8 Knockout Championship Arena',
        link: '/admin/tournaments'
      },
      {
        type: 'BOOKING_RESCHEDULED',
        category: 'RESCHEDULE',
        title: 'Booking Rescheduled',
        message: 'Station PC-04 booking shifted to 20:00 SLST tonight',
        link: '/admin/bookings'
      },
      {
        type: 'BOOKING_CANCELLED',
        category: 'CANCEL',
        title: 'Booking Slot Cancelled',
        message: 'Station VR-01 booking cancelled by customer',
        link: '/admin/bookings'
      }
    ];

    const pick = types[Math.floor(Math.random() * types.length)];
    this.sendNotification(pick);
  }

  sendCustomerTestAlert(): void {
    const types: NotificationPayload[] = [
      {
        type: 'BOOKING_CONFIRMED',
        category: 'BOOKING',
        title: 'Booking Confirmed! 🎮',
        message: 'Station PS5-02 reserved for 2 hours today at 16:00 (LKR 1,600.00)',
        link: '/bookings'
      },
      {
        type: 'TOURNAMENT_ENROLLED',
        category: 'TOURNAMENT',
        title: 'Tournament Enrolled! 🏆',
        message: 'You have entered Tekken 8 Knockout Championship Arena. View your bracket!',
        link: '/tournaments'
      },
      {
        type: 'MATCH_REMINDER',
        category: 'TOURNAMENT',
        title: 'Match Starting Soon ⚡',
        message: 'Your Round 1 match begins in 15 minutes at Station PC-04!',
        link: '/tournaments'
      },
      {
        type: 'BOOKING_REMINDER',
        category: 'BOOKING',
        title: 'Session Reminder ⏰',
        message: 'Your gaming session starts in 30 minutes at Gaming Castle Jaffna.',
        link: '/bookings'
      },
      {
        type: 'LOYALTY_AWARD',
        category: 'PAYMENT',
        title: 'Loyalty XP Rewarded! 🎁',
        message: 'You earned +250 XP for completing your session. Keep leveling up!',
        link: '/dashboard'
      }
    ];

    const pick = types[Math.floor(Math.random() * types.length)];
    this.sendNotification(pick);
  }

  // ── Audio & Toast Feedback ─────────────────────────────────────────────────
  private playNotificationSound(): void {
    try {
      if (!this.audioCtx) {
        const AudioContextClass = window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioContextClass) {
          this.audioCtx = new AudioContextClass();
        }
      }

      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      if (this.audioCtx) {
        const now = this.audioCtx.currentTime;
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now); // A5 note
        osc.frequency.exponentialRampToValueAtTime(1318.51, now + 0.12); // E6 note

        gain.gain.setValueAtTime(0.01, now);
        gain.gain.linearRampToValueAtTime(0.2, now + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc.start(now);
        osc.stop(now + 0.35);
      }
    } catch {
      // Audio playback silently ignored if blocked by browser policy
    }
  }

  private showToastAlert(notif: AdminNotification): void {
    if (notif.category === 'CANCEL') {
      this.toast.error(notif.title, notif.message);
    } else if (notif.category === 'RESCHEDULE') {
      this.toast.info(notif.title, notif.message);
    } else {
      this.toast.success(notif.title, notif.message);
    }
  }
}
