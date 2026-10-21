export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'IN_PROGRESS';

export interface BookingRequest {
  stationId: string;
  gameId: string; // required – backend rejects without it
  bookingDate: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  paymentMethod: 'CARD' | 'CASH' | 'POINTS';
  pointsToRedeem?: number;
}

export interface BookingResponse {
  id: string;
  bookingReference: string;
  userId: string;
  stationId: string;
  stationName: string;
  gameId?: string;
  gameTitle?: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
  totalAmount: number;
  discountAmount?: number;
  finalAmount: number;
  status: BookingStatus;
  createdAt: string;
}

export interface CancelBookingRequest {
  reason?: string;
}

export interface RescheduleBookingRequest {
  stationId: string;
  gameId: string;
  startTime: string; // HH:mm or ISO
  endTime: string;   // HH:mm or ISO
  bookingDate?: string; // YYYY-MM-DD
}

export interface BookingReview {
  id: string;
  bookingId: string;
  userId: string;
  stationId?: string;
  stationCode?: string;
  gameTitle?: string;
  rating: number;
  comment?: string;
  createdAt: string;
  updatedAt?: string;
}
