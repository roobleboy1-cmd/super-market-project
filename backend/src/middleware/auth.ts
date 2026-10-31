import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import { User } from '../models/User';
import { Session } from '../models/Session';
import { UnauthorizedError, ForbiddenError } from '../utils/errors';
import { UserRole, Permission } from '../types/roles';
import { hasPermission } from '../policies/rbac';

export async function authenticate(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    let token: string | undefined;

    // 1. Check HttpOnly cookie
    if (req.cookies && req.cookies.access_token) {
      token = req.cookies.access_token;
    }
    // 2. Check Authorization Bearer header
    else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      throw new UnauthorizedError('Authentication token missing. Please log in.');
    }

    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch (err: any) {
      if (err.name === 'TokenExpiredError') {
        throw new UnauthorizedError('Access token has expired. Please refresh your session.');
      }
      throw new UnauthorizedError('Invalid authentication token.');
    }

    // Check user in database
    const user = await User.findById(payload.id);
    if (!user) {
      throw new UnauthorizedError('The user belonging to this token no longer exists.');
    }

    if (user.status !== 'active') {
      throw new ForbiddenError(`Account is currently ${user.status}. Please contact an administrator.`);
    }

    // Check if session has been revoked
    if (payload.sessionId) {
      const session = await Session.findById(payload.sessionId);
      if (!session || session.isRevoked) {
        throw new UnauthorizedError('Session has been revoked or expired. Please log in again.');
      }
    }

    req.user = {
      id: (user._id as any).toString(),
      email: user.email,
      name: user.name,
      role: user.role,
      permissions: user.permissions as Permission[],
      sessionId: payload.sessionId
    };

    next();
  } catch (error) {
    next(error);
  }
}

export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthorizedError());
    }

    if (req.user.role === UserRole.ADMIN) {
      return next(); // Admin always allowed
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new ForbiddenError(`Your role '${req.user.role}' is not authorized to access this resource.`)
      );
    }

    next();
  };
}

export function requirePermission(...requiredPermissions: Permission[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthorizedError());
    }

    const hasAll = requiredPermissions.every((perm) =>
      hasPermission(req.user!.role, perm, req.user!.permissions)
    );

    if (!hasAll) {
      return next(
        new ForbiddenError(
          `Insufficient permissions. Required: [${requiredPermissions.join(', ')}]`
        )
      );
    }

    next();
  };
}
