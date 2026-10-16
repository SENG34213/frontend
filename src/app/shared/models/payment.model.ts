export type PaymentMethod = 'CARD' | 'ONLINE' | 'CASH' | 'LOYALTY_POINTS';
export type PaymentStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED';
export type ReferenceType = 'BOOKING' | 'TOURNAMENT';

export interface PaymentResponse {
  id: string;
  userId: string;
  referenceType?: ReferenceType;
  referenceId?: string;
  bookingId?: string;
  amount: number;
  originalAmount?: number;
  loyaltyPointsUsed?: number;
  loyaltyDiscount?: number;
  method?: PaymentMethod;
  paymentMethod?: PaymentMethod;
  status: PaymentStatus;
  receiptNumber?: string;
  transactionReference?: string;
  idempotencyKey?: string;
  createdAt: string;
  updatedAt?: string;
  customerName?: string;
  customerEmail?: string;
}

export interface PaymentRequest {
  referenceType: ReferenceType;
  referenceId: string;
  amount: number;
  method: PaymentMethod;
  idempotencyKey: string;
  loyaltyPointsToRedeem?: number;
  customerUserId?: string;
}

export interface PagedPayments {
  content: PaymentResponse[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

export interface PaymentFilter {
  status?: PaymentStatus | '';
  method?: PaymentMethod | '';
  referenceType?: ReferenceType | '';
  userId?: string;
  from?: string;
  to?: string;
  page: number;
  size: number;
  sort?: string;
}

export interface ReceiptDto {
  receiptNumber: string;
  bookingReference: string;
  customerName: string;
  customerEmail: string;
  stationName: string;
  date: string;
  timeSlot: string;
  hourlyRate: number;
  hours: number;
  subtotal: number;
  discount: number;
  totalPaid: number;
  paymentMethod: PaymentMethod;
  paymentDate: string;
}
