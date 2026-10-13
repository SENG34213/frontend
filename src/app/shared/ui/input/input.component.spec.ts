import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { InputComponent } from './input.component';

describe('InputComponent', () => {
  let component: InputComponent;
  let fixture: ComponentFixture<InputComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InputComponent, FormsModule]
    }).compileComponents();

    fixture = TestBed.createComponent(InputComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the input component', () => {
    expect(component).toBeTruthy();
  });

  it('should write value via ControlValueAccessor writeValue', () => {
    component.writeValue('test gamer');
    expect(component.value).toBe('test gamer');
  });

  it('should notify onChange on input event', () => {
    const spy = jasmine.createSpy('onChangeSpy');
    component.registerOnChange(spy);

    const inputEl = fixture.nativeElement.querySelector('input');
    inputEl.value = 'new value';
    inputEl.dispatchEvent(new Event('input'));

    expect(spy).toHaveBeenCalledWith('new value');
  });

  it('should show error message and have role=alert when errorMessage is set', () => {
    fixture.componentRef.setInput('errorMessage', 'Field is required');
    fixture.detectChanges();

    const errorEl = fixture.nativeElement.querySelector('.gc-input-error');
    expect(errorEl).toBeTruthy();
    expect(errorEl.textContent).toContain('Field is required');
    expect(errorEl.getAttribute('role')).toBe('alert');
  });

  it('should show label and hint text', () => {
    fixture.componentRef.setInput('label', 'Password');
    fixture.componentRef.setInput('hint', 'Must be 8 characters');
    fixture.detectChanges();

    const labelEl = fixture.nativeElement.querySelector('.gc-input-label');
    const hintEl = fixture.nativeElement.querySelector('.gc-input-hint');
    expect(labelEl.textContent).toContain('Password');
    expect(hintEl.textContent).toContain('Must be 8 characters');
  });
});
