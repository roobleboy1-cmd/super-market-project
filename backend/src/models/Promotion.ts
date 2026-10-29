import mongoose, { Document, Schema } from 'mongoose';

export interface IPromotion extends Document {
  name: string;
  code: string;
  type: 'PERCENTAGE' | 'FIXED_AMOUNT';
  value: number; // e.g. 10 for 10% or $5
  minPurchaseAmount: number;
  applicableCategoryIds?: mongoose.Types.ObjectId[];
  applicableProductIds?: mongoose.Types.ObjectId[];
  startDate: Date;
  endDate: Date;
  usageLimit?: number;
  timesUsed: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const promotionSchema = new Schema<IPromotion>(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
    type: { type: String, enum: ['PERCENTAGE', 'FIXED_AMOUNT'], required: true },
    value: { type: Number, required: true, min: 0 },
    minPurchaseAmount: { type: Number, default: 0, min: 0 },
    applicableCategoryIds: [{ type: Schema.Types.ObjectId, ref: 'Category' }],
    applicableProductIds: [{ type: Schema.Types.ObjectId, ref: 'Product' }],
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    usageLimit: { type: Number },
    timesUsed: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true, index: true }
  },
  {
    timestamps: true
  }
);

export const Promotion = mongoose.model<IPromotion>('Promotion', promotionSchema);
