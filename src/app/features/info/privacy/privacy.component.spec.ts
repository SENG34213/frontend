import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { PrivacyComponent } from './privacy.component';

describe('PrivacyComponent', () => {
  let component: PrivacyComponent;
  let fixture: ComponentFixture<PrivacyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PrivacyComponent],
      providers: [provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(PrivacyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should render all policy sections', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(component.sections.length).toBeGreaterThanOrEqual(4);
    expect(el.textContent).toContain('Information We Collect');
    expect(el.textContent).toContain('Payment & Financial Data Protection');
  });

  it('should update activeSectionId when scrollToSection is called', () => {
    component.scrollToSection('usage');
    expect(component.activeSectionId()).toBe('usage');
  });
});
