import mongoose, { Document, Schema } from 'mongoose';
import { PaymentMethodType } from '../types/common';

export interface IPaymentMethodSummary {
  method: PaymentMethodType;
  totalAmount: number;
  transactionCount: number;
}

export interface ICashierShift extends Document {
  shiftNumber: string;
  cashierId: mongoose.Types.ObjectId;
  openedAt: Date;
  closedAt?: Date;
  openingCash: number;
  totalSalesCash: number;
  totalCashPayIn: number;
  totalCashPayOut: number;
  totalCashDrop: number;
  expectedCash: number;
  countedCash?: number;
  cashDiscrepancy?: number; // countedCash - expectedCash
  paymentMethodSummaries: IPaymentMethodSummary[];
  status: 'open' | 'closed' | 'approved';
  notes?: string;
  closedBy?: mongoose.Types.ObjectId;
  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const paymentMethodSummarySchema = new Schema<IPaymentMethodSummary>(
  {
    method: {
      type: String,
      enum: ['CASH', 'CARD', 'EVC_PLUS', 'EDAHAB', 'ZAAD', 'BANK_TRANSFER'],
      required: true
    },
    totalAmount: { type: Number, default: 0 },
    transactionCount: { type: Number, default: 0 }
  },
  { _id: false }
);

const cashierShiftSchema = new Schema<ICashierShift>(
  {
    shiftNumber: { type: String, required: true, unique: true, index: true },
    cashierId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    openedAt: { type: Date, default: Date.now, required: true },
    closedAt: { type: Date },
    openingCash: { type: Number, required: true, min: 0 },
    totalSalesCash: { type: Number, default: 0 },
    totalCashPayIn: { type: Number, default: 0 },
    totalCashPayOut: { type: Number, default: 0 },
    totalCashDrop: { type: Number, default: 0 },
    expectedCash: { type: Number, default: 0 },
    countedCash: { type: Number },
    cashDiscrepancy: { type: Number },
    paymentMethodSummaries: [paymentMethodSummarySchema],
    status: {
      type: String,
      enum: ['open', 'closed', 'approved'],
      default: 'open',
      index: true
    },
    notes: { type: String, trim: true },
    closedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date }
  },
  {
    timestamps: true
  }
);

cashierShiftSchema.index({ cashierId: 1, status: 1 });

export const CashierShift = mongoose.model<ICashierShift>('CashierShift', cashierShiftSchema);
