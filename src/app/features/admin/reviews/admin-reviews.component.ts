import {
  Component,
  OnInit,
  signal,
  computed,
  inject,
  ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { BookingService } from '../../../core/services/booking.service';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { BookingReview } from '../../../shared/models';
import {
  ButtonComponent,
  BadgeComponent,
  SkeletonComponent,
  EmptyStateComponent,
  ModalComponent,
  PaginationComponent
} from '../../../shared/ui';

export interface StationRankingItem {
  stationCode: string;
  stationName: string;
  averageRating: number;
  reviewCount: number;
  recommendationRate: number;
}

@Component({
  selector: 'app-admin-reviews',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    FormsModule,
    RouterModule,
    ButtonComponent,
    BadgeComponent,
    SkeletonComponent,
    EmptyStateComponent,
    ModalComponent,
    PaginationComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-reviews.component.html',
  styleUrl: './admin-reviews.component.scss'
})
export class AdminReviewsComponent implements OnInit {
  private readonly bookingService = inject(BookingService);
  private readonly toast = inject(ToastService);

  // ─── Signals ──────────────────────────────────────────────────────────────
  readonly reviews = signal<BookingReview[]>([]);
  readonly isLoading = signal<boolean>(false);
  readonly searchQuery = signal<string>('');
  readonly starFilter = signal<number | 'ALL'>('ALL');
  readonly stationFilter = signal<string>('ALL');
  readonly statusFilter = signal<string>('ALL');
  readonly sortBy = signal<'date-desc' | 'date-asc' | 'rating-desc' | 'rating-asc'>('date-desc');
  readonly viewMode = signal<'table' | 'cards'>('table');

  // Pagination
  readonly currentPage = signal<number>(1);
  readonly pageSize = signal<number>(8);

  // Modals
  readonly isDetailModalOpen = signal<boolean>(false);
  readonly selectedReview = signal<BookingReview | null>(null);
  readonly isDeleteModalOpen = signal<boolean>(false);
  readonly reviewToDelete = signal<BookingReview | null>(null);

  // ─── Computations ─────────────────────────────────────────────────────────

  readonly totalReviews = computed(() => this.reviews().length);

  readonly averageRating = computed(() => {
    const list = this.reviews();
    if (list.length === 0) return 0;
    const sum = list.reduce((acc, r) => acc + (r.rating || 5), 0);
    return Number((sum / list.length).toFixed(2));
  });

  readonly fiveStarRatio = computed(() => {
    const list = this.reviews();
    if (list.length === 0) return 0;
    const count = list.filter((r) => r.rating === 5).length;
    return Math.round((count / list.length) * 100);
  });

  readonly positiveRate = computed(() => {
    const list = this.reviews();
    if (list.length === 0) return 0;
    const positive = list.filter((r) => r.rating >= 4).length;
    return Math.round((positive / list.length) * 100);
  });

  readonly ratingDistribution = computed(() => {
    const list = this.reviews();
    const total = list.length || 1;
    const counts: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    for (const r of list) {
      const star = Math.min(5, Math.max(1, Math.round(r.rating || 5)));
      counts[star] = (counts[star] || 0) + 1;
    }
    return [5, 4, 3, 2, 1].map((stars) => ({
      stars,
      count: counts[stars] || 0,
      percent: Math.round(((counts[stars] || 0) / total) * 100)
    }));
  });

  readonly stationOptions = computed(() => {
    const set = new Set<string>();
    for (const r of this.reviews()) {
      if (r.stationCode) set.add(r.stationCode);
    }
    return Array.from(set).sort();
  });

  readonly stationRankings = computed<StationRankingItem[]>(() => {
    const map = new Map<string, { totalRating: number; count: number; highCount: number }>();

    for (const r of this.reviews()) {
      const code = r.stationCode || 'PS5-01';
      const existing = map.get(code) || { totalRating: 0, count: 0, highCount: 0 };
      existing.totalRating += r.rating || 5;
      existing.count += 1;
      if (r.rating >= 4) existing.highCount += 1;
      map.set(code, existing);
    }

    const items: StationRankingItem[] = [];
    for (const [code, val] of map.entries()) {
      items.push({
        stationCode: code,
        stationName: `Station ${code}`,
        averageRating: Number((val.totalRating / val.count).toFixed(1)),
        reviewCount: val.count,
        recommendationRate: Math.round((val.highCount / val.count) * 100)
      });
    }

    return items.sort((a, b) => b.averageRating - a.averageRating);
  });

  readonly filteredReviews = computed(() => {
    let list = this.reviews();
    const q = this.searchQuery().trim().toLowerCase();
    const star = this.starFilter();
    const station = this.stationFilter();
    const status = this.statusFilter();
    const sort = this.sortBy();

    if (q) {
      list = list.filter((r) =>
        (r.userName && r.userName.toLowerCase().includes(q)) ||
        (r.comment && r.comment.toLowerCase().includes(q)) ||
        (r.gameTitle && r.gameTitle.toLowerCase().includes(q)) ||
        (r.stationCode && r.stationCode.toLowerCase().includes(q)) ||
        (r.bookingId && r.bookingId.toLowerCase().includes(q))
      );
    }

    if (star !== 'ALL') {
      list = list.filter((r) => Math.round(r.rating) === star);
    }

    if (station !== 'ALL') {
      list = list.filter((r) => r.stationCode === station);
    }

    if (status !== 'ALL') {
      list = list.filter((r) => {
        if (status === 'FEATURED') return r.featured === true;
        if (status === 'ACTIVE') return r.status === 'ACTIVE' || (!r.status && !r.featured);
        return true;
      });
    }

    return [...list].sort((a, b) => {
      if (sort === 'date-desc') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (sort === 'date-asc') {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      if (sort === 'rating-desc') {
        return b.rating - a.rating;
      }
      if (sort === 'rating-asc') {
        return a.rating - b.rating;
      }
      return 0;
    });
  });

  readonly totalPages = computed(() => {
    const len = this.filteredReviews().length;
    return Math.max(1, Math.ceil(len / this.pageSize()));
  });

  readonly startIndex = computed(() => {
    if (this.filteredReviews().length === 0) return 0;
    return (this.currentPage() - 1) * this.pageSize() + 1;
  });

  readonly endIndex = computed(() => {
    return Math.min(this.currentPage() * this.pageSize(), this.filteredReviews().length);
  });

  readonly pagedReviews = computed(() => {
    const list = this.filteredReviews();
    const start = (this.currentPage() - 1) * this.pageSize();
    return list.slice(start, start + this.pageSize());
  });

  ngOnInit(): void {
    this.loadReviews();
  }

  loadReviews(): void {
    this.isLoading.set(true);
    this.bookingService.getRecentReviews().subscribe({
      next: (data) => {
        this.reviews.set(data);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.toast.error('Failed to load reviews from booking service.');
      }
    });
  }

  // ─── Actions ──────────────────────────────────────────────────────────────

  setStarFilter(star: number | 'ALL'): void {
    this.starFilter.set(star);
    this.currentPage.set(1);
  }

  setStationFilter(station: string): void {
    this.stationFilter.set(station);
    this.currentPage.set(1);
  }

  setStatusFilter(status: string): void {
    this.statusFilter.set(status);
    this.currentPage.set(1);
  }

  setSortBy(sort: 'date-desc' | 'date-asc' | 'rating-desc' | 'rating-asc'): void {
    this.sortBy.set(sort);
  }

  onPageChange(page: number): void {
    this.currentPage.set(page);
  }

  toggleFeatured(review: BookingReview): void {
    const currentList = this.reviews();
    const updated = currentList.map((r) => {
      if (r.id === review.id) {
        const nextFeatured = !r.featured;
        return {
          ...r,
          featured: nextFeatured,
          status: (nextFeatured ? 'FEATURED' : 'ACTIVE') as 'FEATURED' | 'ACTIVE'
        };
      }
      return r;
    });

    this.reviews.set(updated);
    const isNowFeatured = !review.featured;
    if (isNowFeatured) {
      this.toast.success(`Review by ${review.userName || 'Player'} is now featured on the landing page!`, 'Featured Updated');
    } else {
      this.toast.info(`Review by ${review.userName || 'Player'} was unfeatured.`, 'Featured Removed');
    }
  }

  openDetail(review: BookingReview): void {
    this.selectedReview.set(review);
    this.isDetailModalOpen.set(true);
  }

  closeDetail(): void {
    this.isDetailModalOpen.set(false);
    this.selectedReview.set(null);
  }

  openDeleteModal(review: BookingReview): void {
    this.reviewToDelete.set(review);
    this.isDeleteModalOpen.set(true);
  }

  closeDeleteModal(): void {
    this.isDeleteModalOpen.set(false);
    this.reviewToDelete.set(null);
  }

  executeDelete(): void {
    const target = this.reviewToDelete();
    if (!target) return;

    const currentList = this.reviews();
    this.reviews.set(currentList.filter((r) => r.id !== target.id));
    this.toast.success(`Review #${target.id} has been removed from public view.`, 'Review Moderated');
    this.closeDeleteModal();

    if (this.currentPage() > this.totalPages()) {
      this.currentPage.set(this.totalPages());
    }
  }

  exportCsv(): void {
    const list = this.filteredReviews();
    if (list.length === 0) {
      this.toast.warning('No reviews to export with current filters.');
      return;
    }

    const headers = ['Review ID', 'Booking ID', 'Player Name', 'Station Code', 'Game Title', 'Rating', 'Comment', 'Featured', 'Created Date'];
    const rows = list.map((r) => [
      `"${r.id}"`,
      `"${r.bookingId}"`,
      `"${r.userName || 'Anonymous'}"`,
      `"${r.stationCode || ''}"`,
      `"${r.gameTitle || ''}"`,
      r.rating,
      `"${(r.comment || '').replace(/"/g, '""')}"`,
      r.featured ? 'YES' : 'NO',
      `"${r.createdAt}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `gaming_castle_reviews_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    this.toast.success('Reviews exported to CSV successfully!');
  }

  getInitials(name?: string): string {
    if (!name) return 'GC';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
}
