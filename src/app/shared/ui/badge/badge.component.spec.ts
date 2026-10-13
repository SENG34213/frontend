import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BadgeComponent } from './badge.component';

describe('BadgeComponent', () => {
  let component: BadgeComponent;
  let fixture: ComponentFixture<BadgeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BadgeComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(BadgeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the badge component', () => {
    expect(component).toBeTruthy();
  });

  it('should apply the available status class', () => {
    fixture.componentRef.setInput('variant', 'available');
    fixture.detectChanges();

    const badgeEl = fixture.nativeElement.querySelector('.gc-badge');
    expect(badgeEl.classList).toContain('badge-available');
  });

  it('should render dot indicator by default', () => {
    const dot = fixture.nativeElement.querySelector('.badge-dot');
    expect(dot).toBeTruthy();
  });

  it('should hide dot when showDot is false', () => {
    fixture.componentRef.setInput('showDot', false);
    fixture.detectChanges();

    const dot = fixture.nativeElement.querySelector('.badge-dot');
    expect(dot).toBeNull();
  });
});
