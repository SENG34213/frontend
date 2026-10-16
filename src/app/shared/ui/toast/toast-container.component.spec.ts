import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ToastContainerComponent } from './toast-container.component';
import { ToastService } from './toast.service';

describe('ToastContainerComponent', () => {
  let component: ToastContainerComponent;
  let fixture: ComponentFixture<ToastContainerComponent>;
  let toastService: ToastService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ToastContainerComponent],
      providers: [ToastService]
    }).compileComponents();

    fixture = TestBed.createComponent(ToastContainerComponent);
    component = fixture.componentInstance;
    toastService = TestBed.inject(ToastService);
    fixture.detectChanges();
  });

  it('should create the toast container component', () => {
    expect(component).toBeTruthy();
  });

  it('should call toastService.remove when dismissed', () => {
    spyOn(toastService, 'remove');
    component.dismiss('toast-123');
    expect(toastService.remove).toHaveBeenCalledWith('toast-123');
  });

  it('should render active toasts from the service', () => {
    toastService.success('Success message', 'Great');
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Success message');
    expect(text).toContain('Great');
  });
});
