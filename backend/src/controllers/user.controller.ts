import { Request, Response, NextFunction } from 'express';
import { User } from '../models/User';
import { hashPassword } from '../utils/crypto';
import { Send } from '../utils/apiResponse';
import { ConflictError, NotFoundError } from '../utils/errors';
import { AuditService } from '../services/audit.service';
import { paramStr } from '../utils/params';

export class UserController {
  static async getUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = req.query.page ? Number(req.query.page) : 1;
      const limit = req.query.limit ? Number(req.query.limit) : 20;
      const skip = (page - 1) * limit;

      const [users, total] = await Promise.all([
        User.find().sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
        User.countDocuments()
      ]);

      Send.success(res, users, { page, limit, total, totalPages: Math.ceil(total / limit) });
    } catch (error) {
      next(error);
    }
  }

  static async getUserById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await User.findById(paramStr(req.params.id));
      if (!user) throw new NotFoundError('User not found');
      Send.success(res, user);
    } catch (error) {
      next(error);
    }
  }

  static async createUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { name, email, password, role, phone, permissions } = req.body;

      const normalizedEmail = email.toLowerCase().trim();
      const existing = await User.findOne({ email: normalizedEmail });
      if (existing) {
        throw new ConflictError(`User with email '${normalizedEmail}' already exists.`);
      }

      const passwordHash = await hashPassword(password);
      const user = await User.create({
        name,
        email: normalizedEmail,
        passwordHash,
        role,
        phone,
        permissions: permissions || [],
        status: 'active'
      });

      await AuditService.log({
        actorId: req.user!.id,
        action: 'USER_CREATED',
        entity: 'User',
        entityId: (user._id as any).toString(),
        changes: { name, email: normalizedEmail, role }
      });

      Send.created(res, user);
    } catch (error) {
      next(error);
    }
  }

  static async updateUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = paramStr(req.params.id);
      const user = await User.findByIdAndUpdate(
        id,
        { $set: req.body },
        { new: true, runValidators: true }
      );
      if (!user) throw new NotFoundError('User not found');

      await AuditService.log({
        actorId: req.user!.id,
        action: 'USER_UPDATED',
        entity: 'User',
        entityId: id,
        changes: req.body
      });

      Send.success(res, user);
    } catch (error) {
      next(error);
    }
  }

  static async updateUserStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = paramStr(req.params.id);
      const { status } = req.body;
      const user = await User.findByIdAndUpdate(
        id,
        { $set: { status } },
        { new: true }
      );
      if (!user) throw new NotFoundError('User not found');

      await AuditService.log({
        actorId: req.user!.id,
        action: 'USER_STATUS_CHANGED',
        entity: 'User',
        entityId: id,
        changes: { newStatus: status }
      });

      Send.success(res, user);
    } catch (error) {
      next(error);
    }
  }
}
