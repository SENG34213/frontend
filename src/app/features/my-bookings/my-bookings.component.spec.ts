import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { MyBookingsComponent } from './my-bookings.component';
import { BookingService } from '../../core/services/booking.service';
import { MockDataService } from '../../core/services/mock/mock-data.service';
import { BookingResponse } from '../../shared/models/booking.model';

describe('MyBookingsComponent', () => {
  let component: MyBookingsComponent;
  let fixture: ComponentFixture<MyBookingsComponent>;
  let bookingServiceSpy: jasmine.SpyObj<BookingService>;
  let mockDataSpy: jasmine.SpyObj<MockDataService>;

  const mockBookings: BookingResponse[] = [
    {
      id: 'bk-1',
      bookingReference: 'GC-101',
      userId: 'usr-1',
      stationId: 'st-01',
      stationName: 'PS5 Lounge #01',
      gameTitle: 'EA SPORTS FC 25',
      bookingDate: '2026-10-25',
      startTime: '18:00',
      endTime: '20:00',
      totalAmount: 1000,
      finalAmount: 1000,
      status: 'CONFIRMED',
      createdAt: '2026-10-18T10:00:00Z'
    },
    {
      id: 'bk-2',
      bookingReference: 'GC-102',
      userId: 'usr-1',
      stationId: 'st-02',
      stationName: 'PS5 Lounge #02',
      gameTitle: 'TEKKEN 8',
      bookingDate: '2026-10-28',
      startTime: '14:00',
      endTime: '16:00',
      totalAmount: 1200,
      finalAmount: 1200,
      status: 'PENDING',
      createdAt: '2026-10-18T11:00:00Z'
    },
    {
      id: 'bk-3',
      bookingReference: 'GC-103',
      userId: 'usr-1',
      stationId: 'st-01',
      stationName: 'PS5 Lounge #01',
      gameTitle: 'ELDEN RING',
      bookingDate: '2026-10-05',
      startTime: '17:00',
      endTime: '19:00',
      totalAmount: 1000,
      finalAmount: 1000,
      status: 'COMPLETED',
      createdAt: '2026-10-04T09:00:00Z'
    },
    {
      id: 'bk-4',
      bookingReference: 'GC-104',
      userId: 'usr-1',
      stationId: 'st-03',
      stationName: 'VR Rig #01',
      gameTitle: 'GRAN TURISMO 7',
      bookingDate: '2026-10-02',
      startTime: '15:00',
      endTime: '16:00',
      totalAmount: 800,
      finalAmount: 800,
      status: 'CANCELLED',
      createdAt: '2026-10-01T12:00:00Z'
    }
  ];

  beforeEach(async () => {
    bookingServiceSpy = jasmine.createSpyObj('BookingService', ['getMyBookings']);
    mockDataSpy = jasmine.createSpyObj('MockDataService', ['getMyCustomerBookings']);

    bookingServiceSpy.getMyBookings.and.returnValue(of(mockBookings));
    mockDataSpy.getMyCustomerBookings.and.returnValue(of(mockBookings));

    await TestBed.configureTestingModule({
      imports: [MyBookingsComponent],
      providers: [
        provideRouter([]),
        { provide: BookingService, useValue: bookingServiceSpy },
        { provide: MockDataService, useValue: mockDataSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(MyBookingsComponent);
    component = fixture.componentInstance;
  });

  it('should create the component', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should fetch bookings and partition into upcoming vs played correctly', () => {
    fixture.detectChanges();
    expect(component.isLoading()).toBeFalse();
    expect(component.allBookings().length).toBe(4);

    expect(component.upcomingBookings().length).toBe(2);
    expect(component.playedBookings().length).toBe(2);

    expect(component.tabs()[0].badge).toBe(2);
    expect(component.tabs()[1].badge).toBe(2);
  });

  it('should display upcoming bookings by default sorted soonest first', () => {
    fixture.detectChanges();
    expect(component.activeTab()).toBe('upcoming');
    expect(component.currentList().length).toBe(2);
    expect(component.currentList()[0].id).toBe('bk-1');
    expect(component.currentList()[1].id).toBe('bk-2');

    const cards = fixture.nativeElement.querySelectorAll('.booking-card');
    expect(cards.length).toBe(2);
    expect(cards[0].textContent).toContain('EA SPORTS FC 25');
  });

  it('should switch to played tab and show completed & cancelled bookings', () => {
    fixture.detectChanges();
    component.onTabChange('played');
    fixture.detectChanges();

    expect(component.activeTab()).toBe('played');
    expect(component.currentList().length).toBe(2);

    // Sorted newest first: bk-3 (Oct 5) before bk-4 (Oct 2)
    expect(component.currentList()[0].id).toBe('bk-3');
    expect(component.currentList()[1].id).toBe('bk-4');

    const cards = fixture.nativeElement.querySelectorAll('.booking-card');
    expect(cards.length).toBe(2);
    expect(cards[0].textContent).toContain('ELDEN RING');
    expect(cards[1].textContent).toContain('GRAN TURISMO 7');
  });

  it('should display empty state when tab list has no bookings', () => {
    bookingServiceSpy.getMyBookings.and.returnValue(of([]));
    mockDataSpy.getMyCustomerBookings.and.returnValue(of([]));
    fixture.detectChanges();

    expect(component.currentList().length).toBe(0);
    const emptyState = fixture.nativeElement.querySelector('gc-empty-state');
    expect(emptyState).toBeTruthy();
  });

  it('should handle API errors and show retry state', () => {
    bookingServiceSpy.getMyBookings.and.returnValue(throwError(() => new Error('Server error')));
    mockDataSpy.getMyCustomerBookings.and.returnValue(throwError(() => new Error('Server error')));
    fixture.detectChanges();

    expect(component.hasError()).toBeTrue();
    expect(component.isLoading()).toBeFalse();

    bookingServiceSpy.getMyBookings.and.returnValue(of(mockBookings));
    component.loadBookings();
    fixture.detectChanges();

    expect(component.hasError()).toBeFalse();
    expect(component.allBookings().length).toBe(4);
  });
});
