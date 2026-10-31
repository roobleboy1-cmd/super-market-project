import mongoose, { Document, Schema } from 'mongoose';
import { UserRole } from '../types/roles';

export type NotificationType =
  | 'SALE_COMPLETED'
  | 'LOW_STOCK'
  | 'EXPIRING_PRODUCT'
  | 'PURCHASE_RECEIVED'
  | 'REFUND_REQUEST'
  | 'SHIFT_CLOSED'
  | 'SYSTEM_ALERT';

export interface INotification extends Document {
  title: string;
  message: string;
  type: NotificationType;
  targetRoles: UserRole[];
  data?: Record<string, any>;
  readBy: mongoose.Types.ObjectId[];
  isUrgent: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: [
        'SALE_COMPLETED',
        'LOW_STOCK',
        'EXPIRING_PRODUCT',
        'PURCHASE_RECEIVED',
        'REFUND_REQUEST',
        'SHIFT_CLOSED',
        'SYSTEM_ALERT'
      ],
      required: true,
      index: true
    },
    targetRoles: [
      {
        type: String,
        enum: Object.values(UserRole)
      }
    ],
    data: { type: Schema.Types.Mixed },
    readBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    isUrgent: { type: Boolean, default: false, index: true }
  },
  {
    timestamps: true
  }
);

notificationSchema.index({ createdAt: -1 });

export const Notification = mongoose.model<INotification>('Notification', notificationSchema);
