import mongoose, { Document, Schema } from 'mongoose';

export type MovementType =
  | 'PURCHASE_RECEIPT'
  | 'SALE'
  | 'SALE_RETURN'
  | 'PURCHASE_RETURN'
  | 'ADJUSTMENT'
  | 'PHYSICAL_COUNT'
  | 'EXPIRED_DISPOSAL';

export interface IStockMovement extends Document {
  productId: mongoose.Types.ObjectId;
  lotId?: mongoose.Types.ObjectId;
  movementType: MovementType;
  quantity: number; // Positive for additions, negative for deductions
  previousStock: number;
  newStock: number;
  unitCost?: number;
  referenceType?: string;
  referenceId?: mongoose.Types.ObjectId;
  reason?: string;
  performedBy: mongoose.Types.ObjectId;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const stockMovementSchema = new Schema<IStockMovement>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    lotId: { type: Schema.Types.ObjectId, ref: 'InventoryLot' },
    movementType: {
      type: String,
      enum: [
        'PURCHASE_RECEIPT',
        'SALE',
        'SALE_RETURN',
        'PURCHASE_RETURN',
        'ADJUSTMENT',
        'PHYSICAL_COUNT',
        'EXPIRED_DISPOSAL'
      ],
      required: true,
      index: true
    },
    quantity: { type: Number, required: true },
    previousStock: { type: Number, required: true },
    newStock: { type: Number, required: true },
    unitCost: { type: Number },
    referenceType: { type: String, trim: true },
    referenceId: { type: Schema.Types.ObjectId },
    reason: { type: String, trim: true },
    performedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    notes: { type: String, trim: true }
  },
  {
    timestamps: true
  }
);

stockMovementSchema.index({ productId: 1, createdAt: -1 });

export const StockMovement = mongoose.model<IStockMovement>('StockMovement', stockMovementSchema);
