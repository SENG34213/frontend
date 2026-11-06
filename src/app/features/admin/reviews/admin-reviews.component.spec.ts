import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
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
      helpfulCount: 5,
      status: 'FEATURED'
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
      helpfulCount: 2,
      status: 'ACTIVE'
    },
    {
      id: 'rev-03',
      bookingId: 'bk-102',
      userId: 'usr-3',
      userName: 'Third Player',
      stationId: 'st-01',
      stationCode: 'PS5-01',
      gameTitle: 'Gran Turismo 7',
      rating: 3,
      comment: 'Decent experience',
      createdAt: '2026-10-30T09:00:00.000Z',
      featured: false,
      helpfulCount: 0,
      status: 'ACTIVE'
    }
  ];

  let mockBookingService: { getRecentReviews: jasmine.Spy };
  let mockToastService: {
    success: jasmine.Spy;
    info: jasmine.Spy;
    error: jasmine.Spy;
    warning: jasmine.Spy;
  };

  beforeEach(async () => {
    mockBookingService = {
      getRecentReviews: jasmine.createSpy('getRecentReviews').and.returnValue(of(mockReviews))
    };

    mockToastService = {
      success: jasmine.createSpy('success'),
      info: jasmine.createSpy('info'),
      error: jasmine.createSpy('error'),
      warning: jasmine.createSpy('warning')
    };

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
    expect(component.reviews().length).toBe(3);
    expect(component.totalReviews()).toBe(3);
  });

  it('should correctly calculate summary statistics', () => {
    // (5 + 4 + 3) / 3 = 4.00
    expect(component.averageRating()).toBe(4);
    // 1 of 3 = 33%
    expect(component.fiveStarRatio()).toBe(33);
    // 2 of 3 >= 4 = 67%
    expect(component.positiveRate()).toBe(67);
  });

  it('should return 0 for statistics when review list is empty', () => {
    component.reviews.set([]);
    expect(component.averageRating()).toBe(0);
    expect(component.fiveStarRatio()).toBe(0);
    expect(component.positiveRate()).toBe(0);
    expect(component.startIndex()).toBe(0);
  });

  it('should compute rating distribution across 1 to 5 stars', () => {
    const dist = component.ratingDistribution();
    expect(dist.length).toBe(5);
    const star5 = dist.find((d) => d.stars === 5);
    expect(star5?.count).toBe(1);
    expect(star5?.percent).toBe(33);
  });

  it('should compute unique station options and station rankings', () => {
    expect(component.stationOptions()).toEqual(['PS5-01', 'PS5-02']);

    const rankings = component.stationRankings();
    expect(rankings.length).toBe(2);
    // PS5-01 has 2 reviews (5 and 3) -> avg 4.0
    // PS5-02 has 1 review (4) -> avg 4.0
    expect(rankings[0].stationCode).toBeDefined();
    expect(rankings[0].reviewCount).toBeGreaterThan(0);
  });

  describe('Filtering and Searching', () => {
    it('should filter reviews by star rating', () => {
      component.setStarFilter(5);
      expect(component.filteredReviews().length).toBe(1);
      expect(component.filteredReviews()[0].rating).toBe(5);

      component.setStarFilter('ALL');
      expect(component.filteredReviews().length).toBe(3);
    });

    it('should filter reviews by station', () => {
      component.setStationFilter('PS5-02');
      expect(component.filteredReviews().length).toBe(1);
      expect(component.filteredReviews()[0].stationCode).toBe('PS5-02');

      component.setStationFilter('ALL');
      expect(component.filteredReviews().length).toBe(3);
    });

    it('should filter reviews by status (FEATURED and ACTIVE)', () => {
      component.setStatusFilter('FEATURED');
      expect(component.filteredReviews().length).toBe(1);
      expect(component.filteredReviews()[0].id).toBe('rev-01');

      component.setStatusFilter('ACTIVE');
      expect(component.filteredReviews().length).toBe(2);

      component.setStatusFilter('ALL');
      expect(component.filteredReviews().length).toBe(3);
    });

    it('should filter reviews by search query across multiple fields', () => {
      component.searchQuery.set('Tekken');
      expect(component.filteredReviews().length).toBe(1);

      component.searchQuery.set('Second Player');
      expect(component.filteredReviews().length).toBe(1);

      component.searchQuery.set('bk-100');
      expect(component.filteredReviews().length).toBe(1);

      component.searchQuery.set('nonexistent search');
      expect(component.filteredReviews().length).toBe(0);
    });
  });

  describe('Sorting', () => {
    it('should sort by date descending and ascending', () => {
      component.setSortBy('date-desc');
      expect(component.filteredReviews()[0].id).toBe('rev-02'); // Nov 2

      component.setSortBy('date-asc');
      expect(component.filteredReviews()[0].id).toBe('rev-03'); // Oct 30
    });

    it('should sort by rating descending and ascending', () => {
      component.setSortBy('rating-desc');
      expect(component.filteredReviews()[0].rating).toBe(5);

      component.setSortBy('rating-asc');
      expect(component.filteredReviews()[0].rating).toBe(3);
    });
  });

  describe('Pagination', () => {
    it('should calculate totalPages, indices, and page slices correctly', () => {
      component.pageSize.set(2);
      expect(component.totalPages()).toBe(2);
      expect(component.startIndex()).toBe(1);
      expect(component.endIndex()).toBe(2);
      expect(component.pagedReviews().length).toBe(2);

      component.onPageChange(2);
      expect(component.currentPage()).toBe(2);
      expect(component.startIndex()).toBe(3);
      expect(component.endIndex()).toBe(3);
      expect(component.pagedReviews().length).toBe(1);
    });
  });

  describe('Review Actions', () => {
    it('should toggle featured status on and off', () => {
      const activeReview = component.reviews()[1]; // rev-02: featured false
      component.toggleFeatured(activeReview);
      expect(component.reviews().find((r) => r.id === 'rev-02')?.featured).toBeTrue();
      expect(mockToastService.success).toHaveBeenCalled();

      // Toggle off
      const featuredReview = component.reviews().find((r) => r.id === 'rev-02')!;
      component.toggleFeatured(featuredReview);
      expect(component.reviews().find((r) => r.id === 'rev-02')?.featured).toBeFalse();
      expect(mockToastService.info).toHaveBeenCalled();
    });

    it('should open and close review detail modal', () => {
      const review = component.reviews()[0];
      component.openDetail(review);
      expect(component.isDetailModalOpen()).toBeTrue();
      expect(component.selectedReview()).toEqual(review);

      component.closeDetail();
      expect(component.isDetailModalOpen()).toBeFalse();
      expect(component.selectedReview()).toBeNull();
    });

    it('should open and close delete modal, and execute delete', () => {
      const review = component.reviews()[0];
      component.openDeleteModal(review);
      expect(component.isDeleteModalOpen()).toBeTrue();
      expect(component.reviewToDelete()).toEqual(review);

      component.closeDeleteModal();
      expect(component.isDeleteModalOpen()).toBeFalse();
      expect(component.reviewToDelete()).toBeNull();

      // Now execute delete
      component.openDeleteModal(review);
      component.executeDelete();
      expect(component.reviews().length).toBe(2);
      expect(component.reviews().find((r) => r.id === review.id)).toBeUndefined();
      expect(mockToastService.success).toHaveBeenCalled();
    });

    it('should adjust currentPage if deleting review leaves page out of bounds', () => {
      component.pageSize.set(1);
      component.currentPage.set(3); // page 3 has 1 item
      const lastReview = component.reviews()[2];
      component.openDeleteModal(lastReview);
      component.executeDelete();

      // Now total reviews = 2, totalPages = 2, currentPage adjusted to 2
      expect(component.currentPage()).toBe(2);
    });

    it('should do nothing if executeDelete is called without a target', () => {
      component.reviewToDelete.set(null);
      component.executeDelete();
      expect(component.reviews().length).toBe(3);
    });
  });

  describe('CSV Export and Helpers', () => {
    it('should show warning if exporting CSV when no reviews match filters', () => {
      component.searchQuery.set('xyz-no-match');
      component.exportCsv();
      expect(mockToastService.warning).toHaveBeenCalled();
    });

    it('should trigger CSV download when reviews exist', () => {
      const createElementSpy = spyOn(document, 'createElement').and.callThrough();
      component.exportCsv();
      expect(createElementSpy).toHaveBeenCalledWith('a');
      expect(mockToastService.success).toHaveBeenCalledWith('Reviews exported to CSV successfully!');
    });

    it('should generate initials correctly', () => {
      expect(component.getInitials()).toBe('GC');
      expect(component.getInitials('Player')).toBe('PL');
      expect(component.getInitials('Test Gamer')).toBe('TG');
    });

    it('should handle reviews loading failure', () => {
      mockBookingService.getRecentReviews.and.returnValue(throwError(() => new Error('Failure')));
      component.loadReviews();
      expect(component.isLoading()).toBeFalse();
      expect(mockToastService.error).toHaveBeenCalled();
    });
  });
});

