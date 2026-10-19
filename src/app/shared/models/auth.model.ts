export type UserRole = 'CUSTOMER' | 'ADMIN';

export interface AuthResponse {
  accessToken: string;
  tokenType: string;
  userId: string;
  email: string;
  role: UserRole;
  notificationSent?: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface PhoneLoginRequest {
  phoneNumber: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  fullName: string;
  phoneNumber?: string;
}

export interface ForgotPasswordRequest {
  identifier: string; // email or phone
}

export interface ResetPasswordRequest {
  identifier: string;
  code: string;
  newPassword: string;
}

export interface TokenPayload {
  sub: string; // userId or email
  userId?: string;
  email?: string;
  role: UserRole;
  fullName?: string;
  iat: number;
  exp: number;
}

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  phoneNumber?: string;
  role: UserRole;
  active?: boolean;
  enabled?: boolean;
  profileImageUrl?: string;
  avatarUrl?: string;
  createdAt?: string;
}

