export type PaymentMethod = 'CARD' | 'CASH' | 'LOYALTY_POINTS';
export type PaymentStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED';

export interface PaymentResponse {
  id: string;
  bookingId: string;
  userId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  status: PaymentStatus;
  transactionReference: string;
  createdAt: string;
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
