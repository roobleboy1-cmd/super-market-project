import mongoose, { Document, Schema } from 'mongoose';

export interface IInventoryLot extends Document {
  productId: mongoose.Types.ObjectId;
  batchNumber: string;
  quantityReceived: number;
  remainingQuantity: number;
  unitCost: number;
  expirationDate?: Date;
  receivedDate: Date;
  supplierId?: mongoose.Types.ObjectId;
  purchaseId?: mongoose.Types.ObjectId;
  status: 'active' | 'depleted' | 'expired' | 'quarantined';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const inventoryLotSchema = new Schema<IInventoryLot>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    batchNumber: { type: String, required: true, trim: true },
    quantityReceived: { type: Number, required: true, min: 0 },
    remainingQuantity: { type: Number, required: true, min: 0 },
    unitCost: { type: Number, required: true, min: 0 },
    expirationDate: { type: Date, index: true },
    receivedDate: { type: Date, default: Date.now, index: true },
    supplierId: { type: Schema.Types.ObjectId, ref: 'Supplier' },
    purchaseId: { type: Schema.Types.ObjectId, ref: 'Purchase' },
    status: {
      type: String,
      enum: ['active', 'depleted', 'expired', 'quarantined'],
      default: 'active',
      index: true
    },
    notes: { type: String, trim: true }
  },
  {
    timestamps: true
  }
);

// Crucial compound index for FEFO (First-Expired, First-Out) stock allocation
inventoryLotSchema.index({ productId: 1, status: 1, remainingQuantity: 1, expirationDate: 1 });

export const InventoryLot = mongoose.model<IInventoryLot>('InventoryLot', inventoryLotSchema);
