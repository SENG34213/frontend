export type StationType =
  | 'PC'
  | 'CONSOLE'
  | 'VR'
  | 'PS5'
  | 'XBOX_SERIES_X'
  | 'PC_ESPORTS'
  | 'RACING_SIM';

export interface Station {
  id: string;
  stationNumber?: number;
  stationCode?: string;
  name?: string;
  type: StationType;
  hourlyRate: number; // LKR
  specifications?: string;
  controllersCount?: number;
  imageUrl?: string;
  active: boolean;
}

export interface GameStationRequest {
  stationCode: string;
  type: StationType;
  hourlyRate: number;
  active: boolean;
}

export interface GameStationResponse {
  id: string;
  stationCode: string;
  type: StationType;
  hourlyRate: number;
  active: boolean;
}

export interface SlotAvailabilityResponse {
  startTime: string; // ISO Instant or HH:mm
  endTime: string;
  available: boolean;
}

export interface SlotAvailability {
  stationId: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  isAvailable: boolean;
  price: number;
}

export interface Game {
  id: string;
  title: string;
  genre?: string;
  coverImage: string;
  badge?: string;
  publisher?: string;
}
