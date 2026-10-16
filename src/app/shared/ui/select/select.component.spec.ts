import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SelectComponent, SelectOption } from './select.component';

describe('SelectComponent', () => {
  let component: SelectComponent;
  let fixture: ComponentFixture<SelectComponent>;

  const mockOptions: SelectOption[] = [
    { value: 'opt-1', label: 'Option 1' },
    { value: 'opt-2', label: 'Option 2' },
    { value: 3, label: 'Option 3' }
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SelectComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(SelectComponent);
    component = fixture.componentInstance;
    component.options = mockOptions;
    fixture.detectChanges();
  });

  it('should create the select component', () => {
    expect(component).toBeTruthy();
  });

  it('should render options properly', () => {
    const selectEl: HTMLSelectElement = fixture.nativeElement.querySelector('select');
    expect(selectEl).toBeTruthy();
    // Default placeholder option + 3 options
    fixture.componentRef.setInput('placeholder', 'Choose one');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Choose one');
    expect(fixture.nativeElement.textContent).toContain('Option 1');
  });

  it('should implement ControlValueAccessor writeValue', () => {
    component.writeValue('opt-2');
    expect(component.value).toBe('opt-2');

    component.writeValue(null as unknown as string);
    expect(component.value).toBe('');
  });

  it('should implement ControlValueAccessor registerOnChange and onSelectionChange', () => {
    const changeSpy = jasmine.createSpy('onChange');
    component.registerOnChange(changeSpy);

    const selectEl: HTMLSelectElement = fixture.nativeElement.querySelector('select');
    selectEl.value = 'opt-1';
    selectEl.dispatchEvent(new Event('change'));

    expect(component.value).toBe('opt-1');
    expect(changeSpy).toHaveBeenCalledWith('opt-1');
  });

  it('should implement ControlValueAccessor registerOnTouched and onBlur', () => {
    const touchSpy = jasmine.createSpy('onTouched');
    component.registerOnTouched(touchSpy);

    const selectEl: HTMLSelectElement = fixture.nativeElement.querySelector('select');
    selectEl.dispatchEvent(new Event('blur'));

    expect(touchSpy).toHaveBeenCalled();
  });

  it('should handle setDisabledState', () => {
    expect(component.disabled).toBeFalse();
    component.setDisabledState?.(true);
    expect(component.disabled).toBeTrue();
    component.setDisabledState?.(false);
    expect(component.disabled).toBeFalse();
  });

  it('should show error message when errorMessage input is set', () => {
    fixture.componentRef.setInput('errorMessage', 'Selection is required');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Selection is required');
  });
});
