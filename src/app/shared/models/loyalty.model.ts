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
  userName?: string;
  points: number; // positive for earned, negative for redeemed
  description: string;
  type?: 'EARN' | 'REDEEM' | 'ADMIN_ADJUST' | 'REVERT';
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

// ── Admin Loyalty Models (FE-34 / FR-27) ───────────────────────────────────

export interface LoyaltyRules {
  id?: string;
  amountPerPoint: number;
  pointValueLkr: number;
  minRedeemPoints: number;
  redeemStep: number;
  maxDiscountPercent: number;
  reservationTimeoutMinutes: number;
  silverThreshold: number;
  silverMultiplier: number;
  goldThreshold: number;
  goldMultiplier: number;
  updatedBy?: string;
}

export type UpdateLoyaltyRulesRequest = Omit<LoyaltyRules, 'id' | 'updatedBy'>;

export interface AdjustPointsRequest {
  userId: string;
  points: number;
  reason: string;
}

export interface AdminAdjustmentResponse {
  userId: string;
  adjustedPoints: number;
  newBalance: number;
  newTier: LoyaltyTier;
  reason: string;
  timestamp: string;
}

export interface AdminLoyaltyStatsResponse {
  totalAccounts: number;
  totalPointsInCirculation: number;
  totalPointsAwardedAllTime: number;
  totalPointsRedeemedAllTime: number;
  accountsByTier: Record<string, number>;
}

export interface LoyaltyAccountResponse {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  phoneNumber?: string;
  pointsBalance: number;
  tier: LoyaltyTier;
  equivalentDiscountLkr: number;
  totalEarnedAllTime: number;
  totalRedeemedAllTime: number;
  updatedAt: string;
}

export interface LoyaltyAccountFilter {
  search?: string;
  tier?: LoyaltyTier | '';
  page: number;
  size: number;
}

export interface PagedLoyaltyAccounts {
  content: LoyaltyAccountResponse[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}
