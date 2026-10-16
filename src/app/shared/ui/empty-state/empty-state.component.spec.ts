import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EmptyStateComponent } from './empty-state.component';

describe('EmptyStateComponent', () => {
  let component: EmptyStateComponent;
  let fixture: ComponentFixture<EmptyStateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EmptyStateComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(EmptyStateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the empty-state component', () => {
    expect(component).toBeTruthy();
  });

  it('should render default title and description', () => {
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Nothing found');
    expect(text).toContain('There is no data to display right now.');
  });

  it('should render custom action label and emit actionClick on click', () => {
    spyOn(component.actionClick, 'emit');

    fixture.componentRef.setInput('actionLabel', 'Create New Booking');
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('button');
    expect(button).toBeTruthy();
    expect(button.textContent).toContain('Create New Booking');

    component.onActionClick();
    expect(component.actionClick.emit).toHaveBeenCalled();
  });
});
