import mongoose, { Document, Schema } from 'mongoose';

export interface IStockCountItem {
  productId: mongoose.Types.ObjectId;
  productName: string;
  sku: string;
  systemStock: number;
  countedStock: number;
  discrepancy: number; // countedStock - systemStock
  unitCost: number;
  discrepancyValue: number;
}

export interface IStockCount extends Document {
  countNumber: string;
  countDate: Date;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  items: IStockCountItem[];
  totalSystemStock: number;
  totalCountedStock: number;
  totalDiscrepancyValue: number;
  countedBy: mongoose.Types.ObjectId;
  submittedAt?: Date;
  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
  rejectionReason?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const stockCountItemSchema = new Schema<IStockCountItem>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    productName: { type: String, required: true },
    sku: { type: String, required: true },
    systemStock: { type: Number, required: true },
    countedStock: { type: Number, required: true },
    discrepancy: { type: Number, required: true },
    unitCost: { type: Number, required: true, default: 0 },
    discrepancyValue: { type: Number, required: true, default: 0 }
  },
  { _id: false }
);

const stockCountSchema = new Schema<IStockCount>(
  {
    countNumber: { type: String, required: true, unique: true, index: true },
    countDate: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ['draft', 'submitted', 'approved', 'rejected'],
      default: 'draft',
      index: true
    },
    items: [stockCountItemSchema],
    totalSystemStock: { type: Number, default: 0 },
    totalCountedStock: { type: Number, default: 0 },
    totalDiscrepancyValue: { type: Number, default: 0 },
    countedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    submittedAt: { type: Date },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
    rejectionReason: { type: String },
    notes: { type: String, trim: true }
  },
  {
    timestamps: true
  }
);

export const StockCount = mongoose.model<IStockCount>('StockCount', stockCountSchema);
