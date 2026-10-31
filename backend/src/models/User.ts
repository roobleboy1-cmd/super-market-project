import mongoose, { Document, Schema } from 'mongoose';
import { UserRole } from '../types/roles';

export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  permissions: string[];
  status: 'active' | 'inactive' | 'suspended';
  phone?: string;
  resetPasswordTokenHash?: string;
  resetPasswordExpires?: Date;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: Object.values(UserRole),
      default: UserRole.CASHIER,
      required: true,
      index: true
    },
    permissions: [{ type: String }],
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended'],
      default: 'active',
      index: true
    },
    phone: { type: String, trim: true },
    resetPasswordTokenHash: { type: String, index: true, select: false },
    resetPasswordExpires: { type: Date, select: false },
    lastLoginAt: { type: Date }
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: any) {
        delete ret.passwordHash;
        delete ret.resetPasswordTokenHash;
        delete ret.resetPasswordExpires;
        delete ret.__v;
        return ret;
      }
    }
  }
);

export const User = mongoose.model<IUser>('User', userSchema);
