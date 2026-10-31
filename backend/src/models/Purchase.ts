import mongoose, { Document, Schema } from 'mongoose';

export interface IPurchaseItem {
  productId: mongoose.Types.ObjectId;
  productName: string;
  sku: string;
  orderedQuantity: number;
  receivedQuantity: number;
  unitCost: number;
  taxRate: number;
  subtotal: number;
  total: number;
  batchNumber?: string;
  expirationDate?: Date;
}

export interface IPurchase extends Document {
  purchaseOrderNumber: string;
  supplierId: mongoose.Types.ObjectId;
  status: 'draft' | 'approved' | 'partially_received' | 'received' | 'cancelled';
  items: IPurchaseItem[];
  subtotal: number;
  taxTotal: number;
  grandTotal: number;
  paidAmount: number;
  paymentStatus: 'unpaid' | 'partially_paid' | 'paid';
  expectedDeliveryDate?: Date;
  createdBy: mongoose.Types.ObjectId;
  approvedBy?: mongoose.Types.ObjectId;
  receivedBy?: mongoose.Types.ObjectId;
  receivedAt?: Date;
  cancelReason?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const purchaseItemSchema = new Schema<IPurchaseItem>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    productName: { type: String, required: true },
    sku: { type: String, required: true },
    orderedQuantity: { type: Number, required: true, min: 0.001 },
    receivedQuantity: { type: Number, default: 0, min: 0 },
    unitCost: { type: Number, required: true, min: 0 },
    taxRate: { type: Number, default: 0, min: 0 },
    subtotal: { type: Number, required: true },
    total: { type: Number, required: true },
    batchNumber: { type: String, trim: true },
    expirationDate: { type: Date }
  },
  { _id: false }
);

const purchaseSchema = new Schema<IPurchase>(
  {
    purchaseOrderNumber: { type: String, required: true, unique: true, index: true },
    supplierId: { type: Schema.Types.ObjectId, ref: 'Supplier', required: true, index: true },
    status: {
      type: String,
      enum: ['draft', 'approved', 'partially_received', 'received', 'cancelled'],
      default: 'draft',
      index: true
    },
    items: [purchaseItemSchema],
    subtotal: { type: Number, required: true, min: 0 },
    taxTotal: { type: Number, default: 0 },
    grandTotal: { type: Number, required: true, min: 0 },
    paidAmount: { type: Number, default: 0, min: 0 },
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'partially_paid', 'paid'],
      default: 'unpaid',
      index: true
    },
    expectedDeliveryDate: { type: Date },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    receivedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    receivedAt: { type: Date },
    cancelReason: { type: String, trim: true },
    notes: { type: String, trim: true }
  },
  {
    timestamps: true
  }
);

purchaseSchema.index({ createdAt: -1 });

export const Purchase = mongoose.model<IPurchase>('Purchase', purchaseSchema);
