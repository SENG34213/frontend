import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ToastService } from './toast.service';

describe('ToastService', () => {
  let service: ToastService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ToastService]
    });
    service = TestBed.inject(ToastService);
  });

  it('should initialize with an empty toast list', () => {
    expect(service.toasts().length).toBe(0);
  });

  it('should add a success toast and auto-dismiss after duration', fakeAsync(() => {
    service.success('Booking confirmed!');

    expect(service.toasts().length).toBe(1);
    expect(service.toasts()[0].type).toBe('success');
    expect(service.toasts()[0].message).toBe('Booking confirmed!');

    tick(5000);
    expect(service.toasts().length).toBe(0);
  }));

  it('should allow manual toast dismissal by id', () => {
    const id = service.show('Test info message', 'info', 'Info', 0);
    expect(service.toasts().length).toBe(1);

    service.remove(id);
    expect(service.toasts().length).toBe(0);
  });

  it('should clear all toasts when clear() is called', () => {
    service.show('Msg 1', 'info', undefined, 0);
    service.show('Msg 2', 'error', undefined, 0);
    expect(service.toasts().length).toBe(2);

    service.clear();
    expect(service.toasts().length).toBe(0);
  });
});
