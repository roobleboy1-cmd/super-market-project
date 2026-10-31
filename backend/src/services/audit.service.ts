import mongoose from 'mongoose';
import { ActivityLog } from '../models/ActivityLog';
import { logger } from '../config/logger';

export interface LogActivityParams {
  actorId?: string | mongoose.Types.ObjectId;
  actorEmail?: string;
  actorRole?: string;
  action: string;
  entity: string;
  entityId?: string;
  changes?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

export class AuditService {
  static async log(params: LogActivityParams): Promise<void> {
    try {
      await ActivityLog.create({
        actorId: params.actorId ? new mongoose.Types.ObjectId(params.actorId) : undefined,
        actorEmail: params.actorEmail,
        actorRole: params.actorRole,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId,
        changes: params.changes,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent
      });
    } catch (error: any) {
      // Never crash the request because of audit logging failure; log error
      logger.error(`Failed to record audit log: ${error.message}`, { params });
    }
  }

  static async getLogs(query: {
    page?: number;
    limit?: number;
    entity?: string;
    action?: string;
    actorId?: string;
  }) {
    const page = Math.max(Number(query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 100);
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = {};
    if (query.entity) filter.entity = query.entity;
    if (query.action) filter.action = query.action;
    if (query.actorId) filter.actorId = new mongoose.Types.ObjectId(query.actorId);

    const [logs, total] = await Promise.all([
      ActivityLog.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('actorId', 'name email role')
        .lean(),
      ActivityLog.countDocuments(filter)
    ]);

    return {
      logs,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }
}
