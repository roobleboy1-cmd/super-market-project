import mongoose, { Document, Schema } from 'mongoose';

export type LoyaltyTransactionType = 'EARNED' | 'REDEEMED' | 'EXPIRED' | 'ADJUSTED';

export interface ILoyaltyTransaction extends Document {
  customerId: mongoose.Types.ObjectId;
  type: LoyaltyTransactionType;
  points: number; // Positive for earned/adjusted up, negative for redeemed/expired
  monetaryEquivalent: number;
  saleId?: mongoose.Types.ObjectId;
  balanceAfter: number;
  reason?: string;
  performedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const loyaltyTransactionSchema = new Schema<ILoyaltyTransaction>(
  {
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
    type: {
      type: String,
      enum: ['EARNED', 'REDEEMED', 'EXPIRED', 'ADJUSTED'],
      required: true,
      index: true
    },
    points: { type: Number, required: true },
    monetaryEquivalent: { type: Number, required: true, default: 0 },
    saleId: { type: Schema.Types.ObjectId, ref: 'Sale', index: true },
    balanceAfter: { type: Number, required: true, min: 0 },
    reason: { type: String, trim: true },
    performedBy: { type: Schema.Types.ObjectId, ref: 'User' }
  },
  {
    timestamps: true
  }
);

loyaltyTransactionSchema.index({ customerId: 1, createdAt: -1 });

export const LoyaltyTransaction = mongoose.model<ILoyaltyTransaction>('LoyaltyTransaction', loyaltyTransactionSchema);
