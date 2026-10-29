import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { env } from '../config/env';

const CSRF_COOKIE_NAME = 'XSRF-TOKEN';
const CSRF_HEADER_NAME = 'x-csrf-token';

export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function setCsrfCookie(res: Response, token: string): void {
  res.cookie(CSRF_COOKIE_NAME, token, {
    httpOnly: false, // Frontend JavaScript must read this to send in header
    secure: env.COOKIE_SECURE,
    sameSite: env.COOKIE_SAME_SITE as any,
    domain: env.COOKIE_DOMAIN || undefined,
    path: '/'
  });
}

export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  // Safe HTTP methods do not require CSRF token
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // Requests authenticated via Authorization Bearer header are immune to CSRF
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    return next();
  }

  // In test environment, bypass CSRF
  if (process.env.NODE_ENV === 'test') {
    return next();
  }

  // Exempt public auth routes when establishing initial session
  const exemptedPaths = [
    '/auth/login',
    '/auth/refresh',
    '/auth/forgot-password',
    '/auth/reset-password'
  ];
  if (exemptedPaths.some((p) => req.originalUrl.includes(p))) {
    return next();
  }

  const cookieToken = req.cookies?.[CSRF_COOKIE_NAME];
  const headerToken = req.headers[CSRF_HEADER_NAME] as string;

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    res.status(403).json({
      success: false,
      error: {
        code: 'CSRF_VALIDATION_FAILED',
        message: 'Invalid or missing CSRF token. Please refresh your session.'
      }
    });
    return;
  }

  next();
}
