export type NotificationCategory = 'BOOKING' | 'TOURNAMENT' | 'CANCEL' | 'RESCHEDULE' | 'PAYMENT' | 'SYSTEM';

export interface AdminNotification {
  id: string;
  type: string;
  category: NotificationCategory;
  title: string;
  message: string;
  referenceId?: string;
  link?: string;
  read: boolean;
  createdAt: string;
  metadata?: Record<string, any>;
}

export interface NotificationPayload {
  type: string;
  category?: NotificationCategory;
  title: string;
  message: string;
  referenceId?: string;
  link?: string;
  data?: Record<string, any>;
  metadata?: Record<string, any>;
}
