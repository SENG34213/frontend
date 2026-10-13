import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PaginationComponent } from './pagination.component';

describe('PaginationComponent', () => {
  let component: PaginationComponent;
  let fixture: ComponentFixture<PaginationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PaginationComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(PaginationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the pagination component', () => {
    expect(component).toBeTruthy();
  });

  it('should not render nav if totalPages is 1', () => {
    fixture.componentRef.setInput('totalPages', 1);
    fixture.detectChanges();

    const nav = fixture.nativeElement.querySelector('.gc-pagination');
    expect(nav).toBeNull();
  });

  it('should render navigation buttons when totalPages > 1', () => {
    fixture.componentRef.setInput('totalPages', 5);
    fixture.componentRef.setInput('currentPage', 0);
    fixture.detectChanges();

    const nav = fixture.nativeElement.querySelector('.gc-pagination');
    expect(nav).toBeTruthy();

    const prevBtn = fixture.nativeElement.querySelector('.nav-btn');
    expect(prevBtn.disabled).toBeTrue(); // First page, prev is disabled
  });

  it('should emit pageChange when valid page clicked', () => {
    fixture.componentRef.setInput('totalPages', 5);
    fixture.componentRef.setInput('currentPage', 0);
    fixture.detectChanges();

    spyOn(component.pageChange, 'emit');
    component.onPageChange(2);

    expect(component.pageChange.emit).toHaveBeenCalledWith(2);
  });
});
