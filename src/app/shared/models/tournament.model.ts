export type TournamentStatus =
  | 'UPCOMING'
  | 'REGISTRATION_OPEN'
  | 'ONGOING'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

export interface TournamentRequest {
  name: string;
  gameTitle: string;
  startDate: string; // ISO-8601 Instant
  endDate?: string;
  entryFee: number;  // LKR
  maxParticipants: number;
  registrationDeadline: string; // ISO-8601 Instant
  imageUrl?: string;
}

export interface TournamentResponse {
  id: string;
  name: string;
  gameTitle: string;
  startDate: string;
  endDate?: string;
  entryFee: number;
  maxParticipants: number;
  participantCount: number;
  registrationDeadline: string;
  status: TournamentStatus;
  createdByAdminId?: string;
  createdAt?: string;
  isRegistrationOpen?: boolean;
  imageUrl?: string;
  bannerUrl?: string;
  // UI aliases
  title?: string;
  description?: string;
  currentParticipants?: number;
}

export interface TournamentStatusUpdateRequest {
  status: TournamentStatus;
}

export interface RegistrationResponse {
  id: string;
  tournamentId: string;
  tournamentName?: string;
  userId: string;
  status: 'PENDING_PAYMENT' | 'CONFIRMED' | 'CANCELLED';
  paymentId?: string;
  registeredAt: string;
  gamerTag?: string;
  userName?: string;
}

export interface MatchResponse {
  id: string;
  bracketId?: string;
  round: number;
  participant1Id?: string;
  participant2Id?: string;
  winnerId?: string;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  scheduledTime?: string;
  participant1Name?: string;
  participant2Name?: string;
  winnerName?: string;
}

export interface BracketResponse {
  id: string;
  tournamentId: string;
  generatedAt: string;
  matches: MatchResponse[];
}

export interface MatchResultRequest {
  winnerId: string;
}

// ── Backwards compatibility aliases ──
export interface TournamentDto extends TournamentResponse {
  winnerName?: string;
}

export interface TournamentRegistrationDto {
  id: string;
  tournamentId: string;
  userId: string;
  gamerTag: string;
  registeredAt: string;
  paid: boolean;
}

export interface MatchDto {
  id: string;
  roundNumber: number;
  matchNumber: number;
  player1Name: string;
  player2Name: string;
  player1Score?: number;
  player2Score?: number;
  winnerName?: string;
  completed: boolean;
}

export interface BracketDto {
  tournamentId: string;
  rounds: {
    roundNumber: number;
    roundName: string;
    matches: MatchDto[];
  }[];
}
