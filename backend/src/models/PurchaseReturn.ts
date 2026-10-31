import mongoose, { Document, Schema } from 'mongoose';

export interface IPurchaseReturnItem {
  productId: mongoose.Types.ObjectId;
  productName: string;
  lotId?: mongoose.Types.ObjectId;
  quantity: number;
  unitCost: number;
  total: number;
  reason: string;
}

export interface IPurchaseReturn extends Document {
  returnNumber: string;
  purchaseId: mongoose.Types.ObjectId;
  supplierId: mongoose.Types.ObjectId;
  items: IPurchaseReturnItem[];
  totalRefundAmount: number;
  status: 'draft' | 'submitted' | 'approved' | 'completed';
  refundStatus: 'pending' | 'received';
  returnedBy: mongoose.Types.ObjectId;
  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const purchaseReturnItemSchema = new Schema<IPurchaseReturnItem>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    productName: { type: String, required: true },
    lotId: { type: Schema.Types.ObjectId, ref: 'InventoryLot' },
    quantity: { type: Number, required: true, min: 0.001 },
    unitCost: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },
    reason: { type: String, required: true, trim: true }
  },
  { _id: false }
);

const purchaseReturnSchema = new Schema<IPurchaseReturn>(
  {
    returnNumber: { type: String, required: true, unique: true, index: true },
    purchaseId: { type: Schema.Types.ObjectId, ref: 'Purchase', required: true, index: true },
    supplierId: { type: Schema.Types.ObjectId, ref: 'Supplier', required: true, index: true },
    items: [purchaseReturnItemSchema],
    totalRefundAmount: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ['draft', 'submitted', 'approved', 'completed'],
      default: 'submitted',
      index: true
    },
    refundStatus: {
      type: String,
      enum: ['pending', 'received'],
      default: 'pending'
    },
    returnedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
    notes: { type: String, trim: true }
  },
  {
    timestamps: true
  }
);

export const PurchaseReturn = mongoose.model<IPurchaseReturn>('PurchaseReturn', purchaseReturnSchema);
