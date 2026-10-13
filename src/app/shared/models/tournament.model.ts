export type TournamentStatus = 'UPCOMING' | 'REGISTRATION_OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface TournamentDto {
  id: string;
  title: string;
  gameTitle: string;
  description: string;
  startDate: string; // ISO date string
  endDate?: string;
  registrationDeadline: string;
  maxParticipants: number;
  currentParticipants: number;
  entryFee: number; // LKR
  status: TournamentStatus;
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
