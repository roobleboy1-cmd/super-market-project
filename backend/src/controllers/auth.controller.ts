import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { Send } from '../utils/apiResponse';
import { generateCsrfToken, setCsrfCookie } from '../middleware/csrf';
import { env } from '../config/env';

export class AuthController {
  static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = req.body;
      const result = await AuthService.login(email, password, req.ip, req.headers['user-agent']);

      // Secure HttpOnly cookie for refresh token
      res.cookie('refresh_token', result.refreshToken, {
        httpOnly: true,
        secure: env.COOKIE_SECURE,
        sameSite: env.COOKIE_SAME_SITE as any,
        domain: env.COOKIE_DOMAIN || undefined,
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      // Secure HttpOnly cookie for access token
      res.cookie('access_token', result.accessToken, {
        httpOnly: true,
        secure: env.COOKIE_SECURE,
        sameSite: env.COOKIE_SAME_SITE as any,
        domain: env.COOKIE_DOMAIN || undefined,
        maxAge: 15 * 60 * 1000 // 15 mins
      });

      // Set CSRF token cookie for frontend client
      const csrfToken = generateCsrfToken();
      setCsrfCookie(res, csrfToken);

      Send.success(res, {
        user: result.user,
        accessToken: result.accessToken,
        csrfToken
      });
    } catch (error) {
      next(error);
    }
  }

  static async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const refreshToken = req.cookies?.refresh_token || req.body?.refreshToken;
      const result = await AuthService.refreshToken(refreshToken, req.ip, req.headers['user-agent']);

      res.cookie('refresh_token', result.refreshToken, {
        httpOnly: true,
        secure: env.COOKIE_SECURE,
        sameSite: env.COOKIE_SAME_SITE as any,
        domain: env.COOKIE_DOMAIN || undefined,
        maxAge: 7 * 24 * 60 * 60 * 1000
      });

      res.cookie('access_token', result.accessToken, {
        httpOnly: true,
        secure: env.COOKIE_SECURE,
        sameSite: env.COOKIE_SAME_SITE as any,
        domain: env.COOKIE_DOMAIN || undefined,
        maxAge: 15 * 60 * 1000
      });

      Send.success(res, {
        accessToken: result.accessToken
      });
    } catch (error) {
      next(error);
    }
  }

  static async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await AuthService.logout(req.user?.sessionId, req.user?.id);

      res.clearCookie('access_token');
      res.clearCookie('refresh_token');
      res.clearCookie('XSRF-TOKEN');

      Send.success(res, { message: 'Logged out successfully' });
    } catch (error) {
      next(error);
    }
  }

  static async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await AuthService.getMe(req.user!.id);
      Send.success(res, user);
    } catch (error) {
      next(error);
    }
  }

  static async getCsrf(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const token = generateCsrfToken();
      setCsrfCookie(res, token);
      Send.success(res, { csrfToken: token });
    } catch (error) {
      next(error);
    }
  }

  static async forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email } = req.body;
      const result = await AuthService.forgotPassword(email, req.ip, req.headers['user-agent']);
      Send.success(res, result);
    } catch (error) {
      next(error);
    }
  }

  static async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token, newPassword } = req.body;
      const result = await AuthService.resetPassword(token, newPassword, req.ip, req.headers['user-agent']);
      Send.success(res, result);
    } catch (error) {
      next(error);
    }
  }

  static async changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { currentPassword, newPassword } = req.body;
      const result = await AuthService.changePassword(req.user!.id, currentPassword, newPassword);
      Send.success(res, result);
    } catch (error) {
      next(error);
    }
  }

  static async updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await AuthService.updateProfile(req.user!.id, req.body);
      Send.success(res, user);
    } catch (error) {
      next(error);
    }
  }
}
