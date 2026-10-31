import mongoose, { Document, Schema } from 'mongoose';

export interface ICoupon extends Document {
  code: string;
  description?: string;
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
  discountValue: number;
  minOrderValue: number;
  maxDiscount?: number;
  expiryDate: Date;
  usageLimit: number;
  timesUsed: number;
  customerId?: mongoose.Types.ObjectId; // If scoped to a specific customer
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const couponSchema = new Schema<ICoupon>(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
    description: { type: String, trim: true },
    discountType: { type: String, enum: ['PERCENTAGE', 'FIXED_AMOUNT'], required: true },
    discountValue: { type: Number, required: true, min: 0 },
    minOrderValue: { type: Number, default: 0, min: 0 },
    maxDiscount: { type: Number, min: 0 },
    expiryDate: { type: Date, required: true, index: true },
    usageLimit: { type: Number, default: 1, min: 1 },
    timesUsed: { type: Number, default: 0, min: 0 },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer' },
    isActive: { type: Boolean, default: true, index: true }
  },
  {
    timestamps: true
  }
);

export const Coupon = mongoose.model<ICoupon>('Coupon', couponSchema);
