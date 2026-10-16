import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CardComponent } from './card.component';

describe('CardComponent', () => {
  let component: CardComponent;
  let fixture: ComponentFixture<CardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CardComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(CardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the card component', () => {
    expect(component).toBeTruthy();
  });

  it('should display title and subtitle when provided', () => {
    fixture.componentRef.setInput('title', 'Station 01');
    fixture.componentRef.setInput('subtitle', 'PlayStation 5 Console');
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Station 01');
    expect(text).toContain('PlayStation 5 Console');
  });

  it('should support glow and interactive inputs', () => {
    fixture.componentRef.setInput('interactive', true);
    fixture.componentRef.setInput('glow', 'blue');
    fixture.detectChanges();

    expect(component.interactive).toBeTrue();
    expect(component.glow).toBe('blue');
  });
});
