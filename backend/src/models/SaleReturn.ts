import mongoose, { Document, Schema } from 'mongoose';
import { PaymentMethodType } from '../types/common';

export interface ISaleReturnItem {
  productId: mongoose.Types.ObjectId;
  productName: string;
  quantity: number;
  unitPrice: number;
  refundAmount: number;
  condition: 'resellable' | 'damaged' | 'expired';
  disposition: 'restocked' | 'quarantined' | 'disposed';
  returnReason: string;
}

export interface ISaleReturn extends Document {
  returnNumber: string;
  originalSaleId: mongoose.Types.ObjectId;
  receiptNumber: string;
  cashierId: mongoose.Types.ObjectId;
  items: ISaleReturnItem[];
  totalRefundAmount: number;
  refundMethod: PaymentMethodType;
  status: 'pending_approval' | 'approved' | 'rejected' | 'completed';
  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const saleReturnItemSchema = new Schema<ISaleReturnItem>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    productName: { type: String, required: true },
    quantity: { type: Number, required: true, min: 0.001 },
    unitPrice: { type: Number, required: true },
    refundAmount: { type: Number, required: true, min: 0 },
    condition: {
      type: String,
      enum: ['resellable', 'damaged', 'expired'],
      default: 'resellable',
      required: true
    },
    disposition: {
      type: String,
      enum: ['restocked', 'quarantined', 'disposed'],
      default: 'restocked',
      required: true
    },
    returnReason: { type: String, required: true, trim: true }
  },
  { _id: false }
);

const saleReturnSchema = new Schema<ISaleReturn>(
  {
    returnNumber: { type: String, required: true, unique: true, index: true },
    originalSaleId: { type: Schema.Types.ObjectId, ref: 'Sale', required: true, index: true },
    receiptNumber: { type: String, required: true },
    cashierId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    items: [saleReturnItemSchema],
    totalRefundAmount: { type: Number, required: true, min: 0 },
    refundMethod: {
      type: String,
      enum: ['CASH', 'CARD', 'EVC_PLUS', 'EDAHAB', 'ZAAD', 'BANK_TRANSFER'],
      default: 'CASH',
      required: true
    },
    status: {
      type: String,
      enum: ['pending_approval', 'approved', 'rejected', 'completed'],
      default: 'completed',
      index: true
    },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
    notes: { type: String, trim: true }
  },
  {
    timestamps: true
  }
);

export const SaleReturn = mongoose.model<ISaleReturn>('SaleReturn', saleReturnSchema);
