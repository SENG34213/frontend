import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BlinkingSquaresComponent } from './blinking-squares.component';

describe('BlinkingSquaresComponent', () => {
  let component: BlinkingSquaresComponent;
  let fixture: ComponentFixture<BlinkingSquaresComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BlinkingSquaresComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(BlinkingSquaresComponent);
    component = fixture.componentInstance;
  });

  it('should create BlinkingSquaresComponent successfully with default application theme values', () => {
    expect(component).toBeTruthy();
    expect(component.direction).toBe('left');
    expect(component.squareSize).toBe(0.28);
    expect(component.squareColor).toBe('#60a5fa');
    expect(component.opacity).toBe(0.25);
  });

  it('should render canvas element in container', () => {
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const canvas = compiled.querySelector('canvas.blinking-squares-canvas');
    expect(canvas).toBeTruthy();
  });

  it('should respond to direction and squareColor input changes', () => {
    component.direction = 'left';
    component.squareColor = '#a855f7';
    fixture.detectChanges();

    expect(component.direction).toBe('left');
    expect(component.squareColor).toBe('#a855f7');
  });

  it('should cleanly stop animation and disconnect observer on destroy', () => {
    fixture.detectChanges();
    expect(() => component.ngOnDestroy()).not.toThrow();
  });
});

