import { ComponentFixture, TestBed } from '@angular/core/testing';
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

  afterEach(() => {
    fixture.destroy();
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

  it('should scramble characters initially when autoStart is enabled', () => {
    component.lines = [
      { text: 'THE ULTIMATE' },
      { text: 'PS5', class: 'hero-accent' }
    ];
    component.duration = 400;
    component.delay = 50;
    component.autoStart = true;

    fixture.detectChanges();

    const lines = component.displayLines();
    const hasScrambled = lines.some((line) =>
      line.chars.some((char) => char.isScrambled && char.targetChar !== ' ')
    );
    expect(hasScrambled).toBeTrue();
  });

  it('should cleanly resolve all characters when resolveAll is called', () => {
    component.lines = [
      { text: 'THE ULTIMATE' },
      { text: 'PS5', class: 'hero-accent' }
    ];
    component.duration = 400;
    component.delay = 50;
    component.autoStart = true;

    fixture.detectChanges();

    component.resolveAll();

    const lines = component.displayLines();
    const allResolved = lines.every((line) =>
      line.chars.every((char) => !char.isScrambled && char.displayChar === char.targetChar)
    );
    expect(allResolved).toBeTrue();
  });

  it('should immediately show resolved text when reduced motion is preferred', () => {
    spyOn(window, 'matchMedia').and.returnValue({
      matches: true,
      media: '(prefers-reduced-motion: reduce)',
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false
    } as unknown as MediaQueryList);

    component.lines = [{ text: 'REDUCED MOTION' }];
    component.autoStart = true;
    component.startAnimation();

    const lines = component.displayLines();
    const allResolved = lines.every((line) =>
      line.chars.every((char) => !char.isScrambled && char.displayChar === char.targetChar)
    );
    expect(allResolved).toBeTrue();
  });

  it('should clean up active animation on destroy', () => {
    component.lines = [{ text: 'TEST' }];
    component.duration = 1000;
    component.autoStart = true;
    fixture.detectChanges();

    expect(() => component.ngOnDestroy()).not.toThrow();
  });
});

