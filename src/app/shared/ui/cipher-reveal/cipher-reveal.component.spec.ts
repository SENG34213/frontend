import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { CipherRevealComponent, CipherRevealLine } from './cipher-reveal.component';

describe('CipherRevealComponent', () => {
  let component: CipherRevealComponent;
  let fixture: ComponentFixture<CipherRevealComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CipherRevealComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(CipherRevealComponent);
    component = fixture.componentInstance;
  });

  it('should create component successfully', () => {
    expect(component).toBeTruthy();
  });

  it('should parse single text input correctly', () => {
    component.text = 'TEST CIPHER';
    component.autoStart = false;
    fixture.detectChanges();

    expect(component.fullText).toBe('TEST CIPHER');
    const lines = component.displayLines();
    expect(lines.length).toBe(1);
    expect(lines[0].chars.map((c) => c.targetChar).join('')).toBe('TEST CIPHER');
  });

  it('should parse multi-line input with CSS classes correctly', () => {
    const testLines: CipherRevealLine[] = [
      { text: 'THE ULTIMATE' },
      { text: 'PS5', class: 'hero-accent' },
      { text: 'EXPERIENCE', class: 'hero-gradient' }
    ];

    component.lines = testLines;
    component.autoStart = false;
    fixture.detectChanges();

    expect(component.fullText).toBe('THE ULTIMATE PS5 EXPERIENCE');
    const lines = component.displayLines();
    expect(lines.length).toBe(3);
    expect(lines[1].class).toBe('hero-accent');
    expect(lines[2].class).toBe('hero-gradient');
    expect(lines[1].chars.length).toBe(3);
  });

  it('should preserve spaces unscrambled', () => {
    component.text = 'A B C';
    component.autoStart = false;
    fixture.detectChanges();

    const chars = component.displayLines()[0].chars;
    expect(chars[1].targetChar).toBe(' ');
    expect(chars[1].displayChar).toBe(' ');
    expect(chars[1].isScrambled).toBeFalse();
  });

  it('should trigger replay on mouseenter when hover is enabled', () => {
    spyOn(component, 'replay');
    component.hover = true;
    fixture.detectChanges();

    component.onMouseEnter();
    expect(component.replay).toHaveBeenCalled();
  });

  it('should not trigger replay on mouseenter when hover is disabled', () => {
    spyOn(component, 'replay');
    component.hover = false;
    fixture.detectChanges();

    component.onMouseEnter();
    expect(component.replay).not.toHaveBeenCalled();
  });

  it('should cleanly resolve all characters after animation duration', fakeAsync(() => {
    component.lines = [
      { text: 'THE ULTIMATE' },
      { text: 'PS5', class: 'hero-accent' }
    ];
    component.duration = 400;
    component.delay = 50;
    component.autoStart = true;

    fixture.detectChanges();

    // Advance timers
    tick(500);

    const lines = component.displayLines();
    const allResolved = lines.every((line) =>
      line.chars.every((char) => !char.isScrambled && char.displayChar === char.targetChar)
    );
    expect(allResolved).toBeTrue();
  }));

  it('should clean up active animation on destroy', () => {
    component.lines = [{ text: 'TEST' }];
    component.duration = 1000;
    component.autoStart = true;
    fixture.detectChanges();

    expect(() => component.ngOnDestroy()).not.toThrow();
  });
});

