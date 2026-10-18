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
  metadata?: Record<string, unknown>;
}

export interface NotificationPayload {
  type: string;
  category?: NotificationCategory;
  title: string;
  message: string;
  referenceId?: string;
  link?: string;
  data?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}
