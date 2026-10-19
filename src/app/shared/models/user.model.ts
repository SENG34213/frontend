export type { UserProfile } from './auth.model';

export interface UpdateProfileRequest {
  fullName: string;
  phoneNumber?: string;
}
