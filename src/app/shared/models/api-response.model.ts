export interface ApiError {
  status: number;
  error?: string;
  message: string;
  action?: string; // Corrective action per NFR-08
  code?: string; // Backend error code (e.g. EMAIL_TAKEN, ACCOUNT_LOCKED)
  timestamp?: string;
  path?: string;
  fieldErrors?: Record<string, string>;
}

export interface PagedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number; // current page (0-indexed)
  first: boolean;
  last: boolean;
  empty: boolean;
}
