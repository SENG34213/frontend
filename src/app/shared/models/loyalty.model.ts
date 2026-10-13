export type LoyaltyTier = 'BRONZE' | 'SILVER' | 'GOLD' | 'VIP';

export interface LoyaltyBalanceDto {
  userId: string;
  pointsBalance: number;
  tier: LoyaltyTier;
  equivalentDiscountLkr: number; // Conversion rate: 100 points = LKR 100 (or per rule)
}

export interface LoyaltyTransactionDto {
  id: string;
  userId: string;
  points: number; // positive for earned, negative for redeemed
  description: string;
  createdAt: string;
}

export interface CalculateRedemptionRequest {
  bookingAmount: number;
  pointsToRedeem: number;
}

export interface RedemptionQuoteDto {
  valid: boolean;
  reason?: string; // Reason shown verbatim per SDS / NFR-08
  discountAmount: number;
  finalPayableAmount: number;
}
