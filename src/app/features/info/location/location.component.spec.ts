import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { LocationComponent } from './location.component';

describe('LocationComponent', () => {
  let component: LocationComponent;
  let fixture: ComponentFixture<LocationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LocationComponent],
      providers: [provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(LocationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should render the correct address and contact information', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('No. 128 Hospital Road, Jaffna');
    expect(el.textContent).toContain('+94 21 222 5588');
    expect(el.textContent).toContain('lounge@gamingcastle.lk');
  });

  it('should have schedule details defined', () => {
    expect(component.schedule.length).toBeGreaterThanOrEqual(4);
  });

  it('should open Google Maps in a new window', () => {
    spyOn(window, 'open');
    component.openGoogleMaps();
    expect(window.open).toHaveBeenCalledWith(
      jasmine.stringMatching(/maps\.google\.com/),
      '_blank',
      'noopener,noreferrer'
    );
  });
});
