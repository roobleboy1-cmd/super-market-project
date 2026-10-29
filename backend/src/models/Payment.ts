import mongoose, { Document, Schema } from 'mongoose';
import { PaymentMethodType } from '../types/common';

export interface IPayment extends Document {
  paymentNumber: string;
  transactionType: 'SALE' | 'PURCHASE' | 'SALE_RETURN' | 'PURCHASE_RETURN' | 'EXPENSE';
  referenceId: mongoose.Types.ObjectId;
  amount: number;
  method: PaymentMethodType;
  status: 'completed' | 'pending' | 'failed' | 'refunded';
  transactionReference?: string;
  processedBy: mongoose.Types.ObjectId;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const paymentSchema = new Schema<IPayment>(
  {
    paymentNumber: { type: String, required: true, unique: true, index: true },
    transactionType: {
      type: String,
      enum: ['SALE', 'PURCHASE', 'SALE_RETURN', 'PURCHASE_RETURN', 'EXPENSE'],
      required: true,
      index: true
    },
    referenceId: { type: Schema.Types.ObjectId, required: true, index: true },
    amount: { type: Number, required: true, min: 0 },
    method: {
      type: String,
      enum: ['CASH', 'CARD', 'EVC_PLUS', 'EDAHAB', 'ZAAD', 'BANK_TRANSFER'],
      required: true,
      index: true
    },
    status: {
      type: String,
      enum: ['completed', 'pending', 'failed', 'refunded'],
      default: 'completed',
      index: true
    },
    transactionReference: { type: String, trim: true },
    processedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    notes: { type: String, trim: true }
  },
  {
    timestamps: true
  }
);

paymentSchema.index({ createdAt: -1 });

export const Payment = mongoose.model<IPayment>('Payment', paymentSchema);
