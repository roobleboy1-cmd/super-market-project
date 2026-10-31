import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { UserRole } from '../types/roles';

export interface TokenPayload {
  id: string;
  email: string;
  role: UserRole;
  sessionId?: string;
}

export function signAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as any
  });
}

export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, env.JWT_SECRET) as TokenPayload;
}
