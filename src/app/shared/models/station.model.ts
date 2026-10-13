export type StationType = 'PS5' | 'XBOX_SERIES_X' | 'PC_ESPORTS' | 'RACING_SIM';

export interface Station {
  id: string;
  stationNumber: number;
  name: string;
  type: StationType;
  hourlyRate: number; // LKR
  specifications?: string;
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
