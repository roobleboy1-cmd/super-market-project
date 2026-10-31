import mongoose, { Document, Schema } from 'mongoose';
import { PaymentMethodType } from '../types/common';

export interface IExpense extends Document {
  expenseNumber: string;
  category: string;
  description: string;
  amount: number;
  paymentMethod: PaymentMethodType;
  paidTo: string;
  paidDate: Date;
  receiptUrl?: string;
  approvedBy?: mongoose.Types.ObjectId;
  recordedBy: mongoose.Types.ObjectId;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const expenseSchema = new Schema<IExpense>(
  {
    expenseNumber: { type: String, required: true, unique: true, index: true },
    category: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    description: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    paymentMethod: {
      type: String,
      enum: ['CASH', 'CARD', 'EVC_PLUS', 'EDAHAB', 'ZAAD', 'BANK_TRANSFER'],
      default: 'CASH',
      required: true
    },
    paidTo: { type: String, required: true, trim: true },
    paidDate: { type: Date, default: Date.now, index: true },
    receiptUrl: { type: String, trim: true },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    recordedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    notes: { type: String, trim: true }
  },
  {
    timestamps: true
  }
);

expenseSchema.index({ paidDate: -1, category: 1 });

export const Expense = mongoose.model<IExpense>('Expense', expenseSchema);
