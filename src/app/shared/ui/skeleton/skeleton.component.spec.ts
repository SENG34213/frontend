import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SkeletonComponent } from './skeleton.component';

describe('SkeletonComponent', () => {
  let component: SkeletonComponent;
  let fixture: ComponentFixture<SkeletonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SkeletonComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(SkeletonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the skeleton component', () => {
    expect(component).toBeTruthy();
  });

  it('should apply shape and width/height correctly', () => {
    fixture.componentRef.setInput('shape', 'circle');
    fixture.componentRef.setInput('width', '48px');
    fixture.componentRef.setInput('height', '48px');
    fixture.detectChanges();

    expect(component.shape).toBe('circle');
    expect(component.width).toBe('48px');
    expect(component.height).toBe('48px');
  });
});
