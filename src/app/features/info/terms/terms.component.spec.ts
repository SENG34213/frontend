import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TermsComponent } from './terms.component';

describe('TermsComponent', () => {
  let component: TermsComponent;
  let fixture: ComponentFixture<TermsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TermsComponent],
      providers: [provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(TermsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should display the default full rules list', () => {
    expect(component.filteredRules().length).toBe(4);
  });

  it('should filter rules when a category is selected', () => {
    component.setCategory('hardware');
    expect(component.selectedCategory()).toBe('hardware');
    const filtered = component.filteredRules();
    expect(filtered.length).toBe(1);
    expect(filtered[0].category).toBe('hardware');
  });
});
