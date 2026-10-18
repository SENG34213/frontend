import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NotificationSocketService } from '../../../core/services/notification-socket.service';
import { NotificationCategory, AdminNotification } from '../../models/notification.model';

@Component({
  selector: 'gc-notification-center',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './notification-center.component.html',
  styleUrl: './notification-center.component.scss'
})
export class NotificationCenterComponent {
  readonly notifService = inject(NotificationSocketService);

  @Input() mode: 'admin' | 'customer' = 'customer';
  @Input() showFloatingTrigger = true;

  getNotificationLink(notif: AdminNotification): string {
    if (this.mode === 'customer') {
      if (notif.link?.startsWith('/admin/bookings')) return '/bookings';
      if (notif.link?.startsWith('/admin/tournaments')) return '/tournaments';
      if (notif.link?.startsWith('/admin')) return '/dashboard';
      return notif.link || '/dashboard';
    }
    return notif.link || '/admin';
  }

  onTestAlert(): void {
    this.notifService.sendTestAlert(this.mode === 'customer');
  }

  getCategoryIcon(category: NotificationCategory): string {
    switch (category) {
      case 'BOOKING': return '🎮';
      case 'TOURNAMENT': return '🏆';
      case 'CANCEL': return '🚫';
      case 'RESCHEDULE': return '🔄';
      case 'PAYMENT': return '💳';
      case 'SYSTEM': return '⚡';
      default: return '🔔';
    }
  }

  getCategoryBadgeClass(category: NotificationCategory): string {
    switch (category) {
      case 'BOOKING': return 'badge-booking';
      case 'TOURNAMENT': return 'badge-tournament';
      case 'CANCEL': return 'badge-cancel';
      case 'RESCHEDULE': return 'badge-reschedule';
      case 'PAYMENT': return 'badge-payment';
      default: return 'badge-system';
    }
  }

  getTimeAgo(isoDate: string): string {
    if (!isoDate) return 'Just now';
    const seconds = Math.floor((new Date().getTime() - new Date(isoDate).getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }
}
