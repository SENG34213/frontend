import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ChromeOrbitComponent } from './chrome-orbit.component';

describe('ChromeOrbitComponent', () => {
  let component: ChromeOrbitComponent;
  let fixture: ComponentFixture<ChromeOrbitComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChromeOrbitComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(ChromeOrbitComponent);
    component = fixture.componentInstance;
  });

  it('should create ChromeOrbitComponent successfully', () => {
    expect(component).toBeTruthy();
    expect(component.isHalo()).toBeFalse();
  });

  it('should toggle halo state when toggleHalo is called', () => {
    spyOn(component.haloChange, 'emit');

    component.toggleHalo();
    expect(component.isHalo()).toBeTrue();
    expect(component.haloChange.emit).toHaveBeenCalledWith(true);

    component.toggleHalo();
    expect(component.isHalo()).toBeFalse();
    expect(component.haloChange.emit).toHaveBeenCalledWith(false);
  });

  it('should not toggle when clicking inside .hero-event-card or button', () => {
    const cardEl = document.createElement('div');
    cardEl.className = 'hero-event-card';
    const mockEvent = {
      target: cardEl
    } as unknown as Event;

    component.toggleHalo(mockEvent);
    expect(component.isHalo()).toBeFalse();
  });

  it('should auto-revert halo after autoRevertDelay', fakeAsync(() => {
    component.autoRevert = true;
    component.autoRevertDelay = 300;

    component.toggleHalo();
    expect(component.isHalo()).toBeTrue();

    tick(350);
    expect(component.isHalo()).toBeFalse();
  }));

  it('should explicitly set halo state with setHalo', () => {
    component.setHalo(true);
    expect(component.isHalo()).toBeTrue();
  });
});

