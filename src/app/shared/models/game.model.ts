import { Station } from './station.model';

export type GameGenre =
  | 'ACTION'
  | 'RPG'
  | 'SPORTS'
  | 'RACING'
  | 'FPS'
  | 'FIGHTING'
  | 'ADVENTURE'
  | 'STRATEGY'
  | 'BATTLE_ROYALE';

export type GamePlatform =
  | 'PS5'
  | 'XBOX_SERIES_X'
  | 'PC'
  | 'NINTENDO_SWITCH'
  | 'VR';

export type AgeRating =
  | 'PEGI_3'
  | 'PEGI_7'
  | 'PEGI_12'
  | 'PEGI_16'
  | 'PEGI_18';

export interface GameTitle {
  id: string;
  title: string;
  genre: GameGenre;
  platforms: GamePlatform[];
  releaseYear: number;
  ageRating: AgeRating;
  description: string;
  coverUrl?: string;
  maxPlayers: number;
  featured: boolean;
  active: boolean;
  installedStationCount: number;
  stations?: Station[];
  stationIds?: string[];
  createdAt: string;
  updatedAt?: string;
}

export interface CreateGameRequest {
  title: string;
  genre: GameGenre;
  platforms: GamePlatform[];
  releaseYear: number;
  ageRating: AgeRating;
  description: string;
  coverUrl?: string;
  maxPlayers: number;
  featured: boolean;
  active: boolean;
  stationIds?: string[];
}

export type UpdateGameRequest = Partial<CreateGameRequest>;

export interface GameFilter {
  search?: string;
  genre?: string;
  platform?: string;
  active?: boolean | null;
  featured?: boolean | null;
  sort?: string;
}

export interface AdminGameStatsResponse {
  totalGames: number;
  activeGames: number;
  featuredGames: number;
  topGenre: string;
  multiplayerGamesCount: number;
}
