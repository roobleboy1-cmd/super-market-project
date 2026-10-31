import mongoose from 'mongoose';
import { Notification, NotificationType } from '../models/Notification';
import { UserRole } from '../types/roles';
import { emitToRoles } from '../sockets/socket';
import { logger } from '../config/logger';

export class NotificationService {
  static async createNotification(params: {
    title: string;
    message: string;
    type: NotificationType;
    targetRoles?: UserRole[];
    data?: Record<string, any>;
    isUrgent?: boolean;
  }) {
    try {
      const targetRoles = params.targetRoles || [UserRole.ADMIN, UserRole.MANAGER];
      const notification = await Notification.create({
        title: params.title,
        message: params.message,
        type: params.type,
        targetRoles,
        data: params.data,
        isUrgent: Boolean(params.isUrgent)
      });

      // Real-time notification broadcast via WebSockets
      emitToRoles(targetRoles, 'notification:new', notification);

      return notification;
    } catch (error: any) {
      logger.error(`Error creating notification: ${error.message}`);
      return null;
    }
  }

  static async getNotificationsForUser(user: { id: string; role: UserRole }): Promise<any[]> {
    const notifications = await Notification.find({
      $or: [{ targetRoles: user.role }, { targetRoles: { $size: 0 } }]
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return notifications.map((n) => ({
      ...n,
      isRead: n.readBy?.some((uid) => uid.toString() === user.id)
    }));
  }

  static async markAsRead(notificationId: string, userId: string) {
    return Notification.findByIdAndUpdate(
      notificationId,
      {
        $addToSet: { readBy: new mongoose.Types.ObjectId(userId) }
      },
      { new: true }
    );
  }

  static async markAllAsRead(userId: string, role: UserRole) {
    return Notification.updateMany(
      {
        targetRoles: role,
        readBy: { $ne: new mongoose.Types.ObjectId(userId) }
      },
      {
        $addToSet: { readBy: new mongoose.Types.ObjectId(userId) }
      }
    );
  }
}
