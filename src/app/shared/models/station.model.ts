export type StationType = 'PS5' | 'XBOX_SERIES_X' | 'PC_ESPORTS' | 'RACING_SIM';

export interface Station {
  id: string;
  stationNumber: number;
  stationCode?: string;
  name: string;
  type: StationType;
  hourlyRate: number; // LKR
  specifications?: string;
  controllersCount?: number;
  imageUrl?: string;
  active: boolean;
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
