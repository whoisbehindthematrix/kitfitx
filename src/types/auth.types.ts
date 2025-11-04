import { User } from '../generated/prisma';

export interface RegisterUserInput {
  email: string;
  password: string;
  name?: string;
  dateOfBirth?: string;
}

export interface LoginUserInput {
  email: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface JWTPayload {
  userId: number;
  email: string;
  role: string;
}

// Extend Express Request type to include authenticated user
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}