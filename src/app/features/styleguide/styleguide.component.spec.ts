import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StyleguideComponent } from './styleguide.component';
import { ToastService } from '../../shared/ui/toast/toast.service';

describe('StyleguideComponent', () => {
  let component: StyleguideComponent;
  let fixture: ComponentFixture<StyleguideComponent>;
  let toastServiceSpy: jasmine.SpyObj<ToastService>;

  beforeEach(async () => {
    toastServiceSpy = jasmine.createSpyObj('ToastService', ['info', 'success', 'error', 'warning']);

    await TestBed.configureTestingModule({
      imports: [StyleguideComponent],
      providers: [
        { provide: ToastService, useValue: toastServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(StyleguideComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the styleguide component', () => {
    expect(component).toBeTruthy();
  });

  it('should trigger toast notification', () => {
    component.triggerToast('Hello demo');
    expect(toastServiceSpy.info).toHaveBeenCalledWith('Hello demo');
  });

  it('should confirm booking and close modal', () => {
    component.isModalOpen.set(true);
    component.onConfirmBooking();
    expect(component.isModalOpen()).toBeFalse();
    expect(toastServiceSpy.success).toHaveBeenCalledWith('Slot booked and confirmed on staging!');
  });
});
