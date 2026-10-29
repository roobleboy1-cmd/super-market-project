import mongoose, { Document, Schema } from 'mongoose';
import { PaymentMethodType } from '../types/common';

export interface ISaleItemLotAllocation {
  lotId: mongoose.Types.ObjectId;
  batchNumber: string;
  quantity: number;
  unitCost: number;
}

export interface ISaleItem {
  productId: mongoose.Types.ObjectId;
  productName: string;
  sku: string;
  barcode: string;
  quantity: number;
  unitPrice: number;
  costPrice: number;
  discount: number;
  taxRate: number;
  taxAmount: number;
  subtotal: number;
  total: number;
  allocatedLots: ISaleItemLotAllocation[];
}

export interface ISalePayment {
  method: PaymentMethodType;
  amount: number;
  reference?: string;
}

export interface ISale extends Document {
  receiptNumber: string;
  cashierId: mongoose.Types.ObjectId;
  shiftId?: mongoose.Types.ObjectId;
  customerId?: mongoose.Types.ObjectId;
  items: ISaleItem[];
  subtotal: number;
  taxTotal: number;
  discountTotal: number;
  grandTotal: number;
  payments: ISalePayment[];
  changeGiven: number;
  paymentStatus: 'paid' | 'partial' | 'voided' | 'refunded';
  status: 'completed' | 'voided' | 'refunded';
  idempotencyKey?: string;
  offlineSyncId?: string;
  voidReason?: string;
  voidedBy?: mongoose.Types.ObjectId;
  voidedAt?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const saleItemLotSchema = new Schema<ISaleItemLotAllocation>(
  {
    lotId: { type: Schema.Types.ObjectId, ref: 'InventoryLot', required: true },
    batchNumber: { type: String, required: true },
    quantity: { type: Number, required: true },
    unitCost: { type: Number, required: true }
  },
  { _id: false }
);

const saleItemSchema = new Schema<ISaleItem>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    productName: { type: String, required: true },
    sku: { type: String, required: true },
    barcode: { type: String, required: true },
    quantity: { type: Number, required: true, min: 0.001 },
    unitPrice: { type: Number, required: true, min: 0 },
    costPrice: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    taxRate: { type: Number, default: 0, min: 0 },
    taxAmount: { type: Number, default: 0, min: 0 },
    subtotal: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },
    allocatedLots: [saleItemLotSchema]
  },
  { _id: false }
);

const salePaymentSchema = new Schema<ISalePayment>(
  {
    method: {
      type: String,
      enum: ['CASH', 'CARD', 'EVC_PLUS', 'EDAHAB', 'ZAAD', 'BANK_TRANSFER'],
      required: true
    },
    amount: { type: Number, required: true, min: 0 },
    reference: { type: String, trim: true }
  },
  { _id: false }
);

const saleSchema = new Schema<ISale>(
  {
    receiptNumber: { type: String, required: true, unique: true, index: true },
    cashierId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    shiftId: { type: Schema.Types.ObjectId, ref: 'CashierShift', index: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', index: true },
    items: [saleItemSchema],
    subtotal: { type: Number, required: true },
    taxTotal: { type: Number, default: 0 },
    discountTotal: { type: Number, default: 0 },
    grandTotal: { type: Number, required: true },
    payments: [salePaymentSchema],
    changeGiven: { type: Number, default: 0 },
    paymentStatus: {
      type: String,
      enum: ['paid', 'partial', 'voided', 'refunded'],
      default: 'paid',
      index: true
    },
    status: {
      type: String,
      enum: ['completed', 'voided', 'refunded'],
      default: 'completed',
      index: true
    },
    idempotencyKey: { type: String, index: true, sparse: true, unique: true },
    offlineSyncId: { type: String, index: true, sparse: true },
    voidReason: { type: String },
    voidedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    voidedAt: { type: Date },
    notes: { type: String, trim: true }
  },
  {
    timestamps: true
  }
);

saleSchema.index({ createdAt: -1 });

export const Sale = mongoose.model<ISale>('Sale', saleSchema);
