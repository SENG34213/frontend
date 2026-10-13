import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private idCounter = 0;
  readonly toasts = signal<ToastMessage[]>([]);

  show(message: string, type: ToastType = 'info', title?: string, duration = 4500): string {
    const id = `toast-${++this.idCounter}`;
    const newToast: ToastMessage = { id, type, title, message, duration };

    this.toasts.update((current) => [...current, newToast]);

    if (duration > 0) {
      setTimeout(() => this.remove(id), duration);
    }
    return id;
  }

  success(message: string, title?: string): string {
    return this.show(message, 'success', title ?? 'Success');
  }

  error(message: string, title?: string): string {
    return this.show(message, 'error', title ?? 'Error', 6000);
  }

  warning(message: string, title?: string): string {
    return this.show(message, 'warning', title ?? 'Warning');
  }

  info(message: string, title?: string): string {
    return this.show(message, 'info', title);
  }

  remove(id: string): void {
    this.toasts.update((current) => current.filter((t) => t.id !== id));
  }

  clear(): void {
    this.toasts.set([]);
  }
}
