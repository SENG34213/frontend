import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AdminReviewsComponent } from './admin-reviews.component';
import { BookingService } from '../../../core/services/booking.service';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { BookingReview } from '../../../shared/models';

describe('AdminReviewsComponent', () => {
  let component: AdminReviewsComponent;
  let fixture: ComponentFixture<AdminReviewsComponent>;

  const mockReviews: BookingReview[] = [
    {
      id: 'rev-01',
      bookingId: 'bk-100',
      userId: 'usr-1',
      userName: 'Test Gamer',
      stationId: 'st-01',
      stationCode: 'PS5-01',
      gameTitle: 'EA Sports FC 25',
      rating: 5,
      comment: 'Excellent session!',
      createdAt: '2026-11-01T10:00:00.000Z',
      featured: true,
      helpfulCount: 5
    },
    {
      id: 'rev-02',
      bookingId: 'bk-101',
      userId: 'usr-2',
      userName: 'Second Player',
      stationId: 'st-02',
      stationCode: 'PS5-02',
      gameTitle: 'Tekken 8',
      rating: 4,
      comment: 'Good game!',
      createdAt: '2026-11-02T12:00:00.000Z',
      featured: false,
      helpfulCount: 2
    }
  ];

  const mockBookingService = {
    getRecentReviews: jasmine.createSpy('getRecentReviews').and.returnValue(of(mockReviews))
  };

  const mockToastService = {
    success: jasmine.createSpy('success'),
    info: jasmine.createSpy('info'),
    error: jasmine.createSpy('error'),
    warning: jasmine.createSpy('warning')
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminReviewsComponent],
      providers: [
        { provide: BookingService, useValue: mockBookingService },
        { provide: ToastService, useValue: mockToastService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AdminReviewsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the admin reviews component', () => {
    expect(component).toBeTruthy();
  });

  it('should load reviews on init', () => {
    expect(mockBookingService.getRecentReviews).toHaveBeenCalled();
    expect(component.reviews().length).toBe(2);
  });

  it('should correctly calculate average rating and 5-star ratio', () => {
    expect(component.averageRating()).toBe(4.5);
    expect(component.fiveStarRatio()).toBe(50);
    expect(component.positiveRate()).toBe(100);
  });

  it('should filter reviews by star rating', () => {
    component.setStarFilter(5);
    expect(component.filteredReviews().length).toBe(1);
    expect(component.filteredReviews()[0].rating).toBe(5);
  });

  it('should toggle featured status of a review', () => {
    const review = component.reviews()[1]; // rev-02 is featured: false
    component.toggleFeatured(review);
    const updated = component.reviews().find((r) => r.id === 'rev-02');
    expect(updated?.featured).toBe(true);
    expect(mockToastService.success).toHaveBeenCalled();
  });
});

