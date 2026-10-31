import mongoose from 'mongoose';
import { User, IUser } from '../models/User';
import { Session } from '../models/Session';
import { hashPassword, comparePassword, generateRandomToken, hashToken } from '../utils/crypto';
import { signAccessToken } from '../utils/jwt';
import { sendPasswordResetEmail } from '../utils/email';
import { AuditService } from './audit.service';
import { AppError, UnauthorizedError, ValidationError, NotFoundError, ForbiddenError } from '../utils/errors';
import { env } from '../config/env';
import { UserRole } from '../types/roles';

export class AuthService {
  /**
   * Authenticate user with email and password
   */
  static async login(
    email: string,
    passwordPlain: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail }).select('+passwordHash');

    if (!user) {
      throw new UnauthorizedError('Invalid email or password credentials');
    }

    if (user.status !== 'active') {
      throw new ForbiddenError(`Your account is ${user.status}. Contact management.`);
    }

    const isMatch = await comparePassword(passwordPlain, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedError('Invalid email or password credentials');
    }

    // Generate refresh token
    const rawRefreshToken = generateRandomToken(40);
    const refreshTokenHash = hashToken(rawRefreshToken);
    const refreshExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Create session record
    const session = await Session.create({
      userId: user._id,
      refreshTokenHash,
      expiresAt: refreshExpiresAt,
      ipAddress,
      userAgent,
      isRevoked: false
    });

    // Generate access token
    const accessToken = signAccessToken({
      id: (user._id as any).toString(),
      email: user.email,
      role: user.role,
      sessionId: (session._id as any).toString()
    });

    // Update last login
    user.lastLoginAt = new Date();
    await user.save();

    await AuditService.log({
      actorId: user._id as any,
      actorEmail: user.email,
      actorRole: user.role,
      action: 'AUTH_LOGIN',
      entity: 'User',
      entityId: (user._id as any).toString(),
      ipAddress,
      userAgent
    });

    return {
      user: user.toJSON(),
      accessToken,
      refreshToken: rawRefreshToken,
      expiresIn: env.JWT_EXPIRES_IN
    };
  }

  /**
   * Rotate refresh token and issue new access token
   */
  static async refreshToken(
    rawRefreshToken: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    if (!rawRefreshToken) {
      throw new UnauthorizedError('Refresh token required');
    }

    const tokenHash = hashToken(rawRefreshToken);
    const session = await Session.findOne({ refreshTokenHash: tokenHash });

    if (!session || session.isRevoked) {
      throw new UnauthorizedError('Invalid or revoked session. Please log in again.');
    }

    if (new Date() > session.expiresAt) {
      throw new UnauthorizedError('Session expired. Please log in again.');
    }

    const user = await User.findById(session.userId);
    if (!user || user.status !== 'active') {
      throw new UnauthorizedError('User account not found or inactive');
    }

    // Refresh Token Rotation: Revoke current session and issue replacement
    const newRawRefreshToken = generateRandomToken(40);
    const newRefreshTokenHash = hashToken(newRawRefreshToken);
    const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    session.isRevoked = true;
    session.replacedByTokenHash = newRefreshTokenHash;
    await session.save();

    const newSession = await Session.create({
      userId: user._id,
      refreshTokenHash: newRefreshTokenHash,
      expiresAt: newExpiresAt,
      ipAddress,
      userAgent,
      isRevoked: false
    });

    const accessToken = signAccessToken({
      id: (user._id as any).toString(),
      email: user.email,
      role: user.role,
      sessionId: (newSession._id as any).toString()
    });

    return {
      accessToken,
      refreshToken: newRawRefreshToken,
      expiresIn: env.JWT_EXPIRES_IN
    };
  }

  /**
   * Logout user by revoking current session
   */
  static async logout(sessionId?: string, userId?: string) {
    if (sessionId) {
      await Session.findByIdAndUpdate(sessionId, { isRevoked: true });
    } else if (userId) {
      await Session.updateMany({ userId: new mongoose.Types.ObjectId(userId) }, { isRevoked: true });
    }
  }

  /**
   * Request password reset link (constant-time response to prevent email enumeration)
   */
  static async forgotPassword(email: string, ipAddress?: string, userAgent?: string) {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    // Always return same message to prevent email enumeration
    const genericResponse = {
      message: 'If an account with that email exists, a password reset link has been sent.'
    };

    if (!user || user.status !== 'active') {
      return genericResponse;
    }

    // Generate secure random single-use token
    const rawResetToken = generateRandomToken(32);
    const resetTokenHash = hashToken(rawResetToken);
    const resetExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    user.resetPasswordTokenHash = resetTokenHash;
    user.resetPasswordExpires = resetExpires;
    await user.save();

    // Send reset link through email service
    await sendPasswordResetEmail(user.email, rawResetToken, user.name);

    await AuditService.log({
      actorId: user._id as any,
      actorEmail: user.email,
      actorRole: user.role,
      action: 'PASSWORD_RESET_REQUESTED',
      entity: 'User',
      entityId: (user._id as any).toString(),
      ipAddress,
      userAgent
    });

    return genericResponse;
  }

  /**
   * Complete password reset using token
   */
  static async resetPassword(token: string, newPasswordPlain: string, ipAddress?: string, userAgent?: string) {
    const tokenHash = hashToken(token.trim());

    const user = await User.findOne({
      resetPasswordTokenHash: tokenHash,
      resetPasswordExpires: { $gt: new Date() }
    }).select('+resetPasswordTokenHash +resetPasswordExpires');

    if (!user) {
      throw new ValidationError('Invalid or expired password reset token. Please request a new link.');
    }

    // Hash new password
    const newPasswordHash = await hashPassword(newPasswordPlain);
    user.passwordHash = newPasswordHash;
    user.resetPasswordTokenHash = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    // Invalidate all active sessions for this user
    await Session.updateMany(
      { userId: user._id, isRevoked: false },
      { isRevoked: true }
    );

    await AuditService.log({
      actorId: user._id as any,
      actorEmail: user.email,
      actorRole: user.role,
      action: 'PASSWORD_RESET_SUCCESS',
      entity: 'User',
      entityId: (user._id as any).toString(),
      ipAddress,
      userAgent
    });

    return {
      message: 'Password reset successful. Please log in with your new credentials.'
    };
  }

  /**
   * Change password for logged in user
   */
  static async changePassword(userId: string, currentPasswordPlain: string, newPasswordPlain: string) {
    const user = await User.findById(userId).select('+passwordHash');
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const isMatch = await comparePassword(currentPasswordPlain, user.passwordHash);
    if (!isMatch) {
      throw new ValidationError('Current password does not match');
    }

    user.passwordHash = await hashPassword(newPasswordPlain);
    await user.save();

    // Invalidate other sessions
    await Session.updateMany(
      { userId: user._id, isRevoked: false },
      { isRevoked: true }
    );

    await AuditService.log({
      actorId: user._id as any,
      actorEmail: user.email,
      actorRole: user.role,
      action: 'PASSWORD_CHANGED',
      entity: 'User',
      entityId: (user._id as any).toString()
    });

    return { message: 'Password updated successfully. Please re-authenticate.' };
  }

  /**
   * Get current authenticated user profile
   */
  static async getMe(userId: string) {
    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }
    return user;
  }

  /**
   * Update profile
   */
  static async updateProfile(userId: string, data: { name?: string; phone?: string }) {
    const user = await User.findByIdAndUpdate(
      userId,
      { $set: data },
      { new: true, runValidators: true }
    );
    if (!user) {
      throw new NotFoundError('User not found');
    }
    return user;
  }
}
