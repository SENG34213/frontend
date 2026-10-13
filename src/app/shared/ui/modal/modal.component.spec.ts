import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ModalComponent } from './modal.component';

describe('ModalComponent', () => {
  let component: ModalComponent;
  let fixture: ComponentFixture<ModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModalComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(ModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the modal component', () => {
    expect(component).toBeTruthy();
  });

  it('should not render dialog when isOpen is false', () => {
    const dialog = fixture.nativeElement.querySelector('.gc-modal-dialog');
    expect(dialog).toBeNull();
  });

  it('should render dialog with title when isOpen is true', () => {
    fixture.componentRef.setInput('isOpen', true);
    fixture.componentRef.setInput('title', 'Slot Reservation');
    fixture.detectChanges();

    const dialog = fixture.nativeElement.querySelector('.gc-modal-dialog');
    const titleEl = fixture.nativeElement.querySelector('.gc-modal-title');
    expect(dialog).toBeTruthy();
    expect(titleEl.textContent).toContain('Slot Reservation');
  });

  it('should emit closed and isOpenChange on close button click', () => {
    fixture.componentRef.setInput('isOpen', true);
    fixture.detectChanges();

    spyOn(component.closed, 'emit');
    spyOn(component.isOpenChange, 'emit');

    const closeBtn = fixture.nativeElement.querySelector('.gc-modal-close');
    closeBtn.click();

    expect(component.closed.emit).toHaveBeenCalled();
    expect(component.isOpenChange.emit).toHaveBeenCalledWith(false);
  });

  it('should close on escape key press', () => {
    fixture.componentRef.setInput('isOpen', true);
    fixture.detectChanges();

    spyOn(component, 'close');
    component.onEscape();

    expect(component.close).toHaveBeenCalled();
  });
});
