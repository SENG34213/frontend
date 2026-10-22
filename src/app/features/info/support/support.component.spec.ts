import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { SupportComponent } from './support.component';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../shared/ui/toast/toast.service';

describe('SupportComponent', () => {
  let component: SupportComponent;
  let fixture: ComponentFixture<SupportComponent>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let toastServiceSpy: jasmine.SpyObj<ToastService>;

  beforeEach(async () => {
    authServiceSpy = jasmine.createSpyObj('AuthService', [], {
      currentUser: signal({
        email: 'player@gamingcastle.lk',
        fullName: 'Kasun Perera',
        role: 'CUSTOMER',
        sub: 'usr-1',
        userId: 'usr-1',
        iat: 0,
        exp: 9999999999
      })
    });

    toastServiceSpy = jasmine.createSpyObj('ToastService', ['success', 'error', 'info', 'warning']);

    await TestBed.configureTestingModule({
      imports: [SupportComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authServiceSpy },
        { provide: ToastService, useValue: toastServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SupportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should prefill user name and email from AuthService', () => {
    expect(component.form.controls.name.value).toBe('Kasun Perera');
    expect(component.form.controls.email.value).toBe('player@gamingcastle.lk');
  });

  it('should toggle FAQ accordion items', () => {
    expect(component.openFaqId()).toBe('faq-1');
    component.toggleFaq('faq-2');
    expect(component.openFaqId()).toBe('faq-2');
    component.toggleFaq('faq-2');
    expect(component.openFaqId()).toBeNull();
  });

  it('should filter FAQs by category', () => {
    component.setFaqCategory('bookings');
    const filtered = component.filteredFaqs();
    expect(filtered.every((f) => f.category === 'bookings')).toBeTrue();
  });

  it('should successfully submit a ticket and show ticket ID', fakeAsync(() => {
    component.form.controls.message.setValue('I would like to reschedule my booking for tomorrow.');
    component.submitTicket();
    expect(component.isSubmitting()).toBeTrue();

    tick(700);

    expect(component.isSubmitting()).toBeFalse();
    expect(component.submittedTicket()).not.toBeNull();
    expect(component.submittedTicket()?.id).toContain('GC-');
    expect(toastServiceSpy.success).toHaveBeenCalled();
  }));
});
