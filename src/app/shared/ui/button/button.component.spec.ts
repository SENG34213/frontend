import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ButtonComponent } from './button.component';

describe('ButtonComponent', () => {
  let component: ButtonComponent;
  let fixture: ComponentFixture<ButtonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ButtonComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(ButtonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the button component', () => {
    expect(component).toBeTruthy();
  });

  it('should apply primary variant and medium size classes by default', () => {
    expect(component.buttonClasses).toContain('btn-primary');
    expect(component.buttonClasses).toContain('btn-md');
  });

  it('should emit btnClick event when clicked and not disabled', () => {
    spyOn(component.btnClick, 'emit');

    const buttonElement = fixture.nativeElement.querySelector('button');
    buttonElement.click();

    expect(component.btnClick.emit).toHaveBeenCalled();
  });

  it('should not emit btnClick when disabled or loading', () => {
    spyOn(component.btnClick, 'emit');

    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();
    component.onClick(new MouseEvent('click'));

    fixture.componentRef.setInput('disabled', false);
    fixture.componentRef.setInput('loading', true);
    fixture.detectChanges();
    component.onClick(new MouseEvent('click'));

    expect(component.btnClick.emit).not.toHaveBeenCalled();
  });

  it('should render spinner when loading is true', () => {
    fixture.componentRef.setInput('loading', true);
    fixture.detectChanges();

    const spinner = fixture.nativeElement.querySelector('.gc-btn-spinner');
    expect(spinner).toBeTruthy();
  });
});
