import mongoose, { Document, Schema } from 'mongoose';

export interface IProduct extends Document {
  name: string;
  sku: string;
  barcode: string;
  category: mongoose.Types.ObjectId;
  brand?: mongoose.Types.ObjectId;
  unit: mongoose.Types.ObjectId;
  defaultSupplier?: mongoose.Types.ObjectId;
  costPrice: number;
  sellingPrice: number;
  taxRate: number;
  currentStock: number;
  minStockLevel: number;
  maxStockLevel: number;
  isExpiringProduct: boolean;
  trackBatch: boolean;
  description?: string;
  imageUrl?: string;
  isArchived: boolean;
  archivedAt?: Date;
  archivedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const productSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true, trim: true, index: true },
    sku: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
    barcode: { type: String, required: true, unique: true, trim: true, index: true },
    category: { type: Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
    brand: { type: Schema.Types.ObjectId, ref: 'Brand' },
    unit: { type: Schema.Types.ObjectId, ref: 'Unit', required: true },
    defaultSupplier: { type: Schema.Types.ObjectId, ref: 'Supplier' },
    costPrice: { type: Number, required: true, min: 0 },
    sellingPrice: { type: Number, required: true, min: 0 },
    taxRate: { type: Number, default: 5, min: 0 },
    currentStock: { type: Number, default: 0, min: 0 },
    minStockLevel: { type: Number, default: 5, min: 0 },
    maxStockLevel: { type: Number, default: 1000, min: 0 },
    isExpiringProduct: { type: Boolean, default: false, index: true },
    trackBatch: { type: Boolean, default: false },
    description: { type: String, trim: true },
    imageUrl: { type: String, trim: true },
    isArchived: { type: Boolean, default: false, index: true },
    archivedAt: { type: Date },
    archivedBy: { type: Schema.Types.ObjectId, ref: 'User' }
  },
  {
    timestamps: true
  }
);

// Compound indexes for searching and fast inventory filtering
productSchema.index({ isArchived: 1, currentStock: 1 });
productSchema.index({ name: 'text', sku: 'text', barcode: 'text' });

export const Product = mongoose.model<IProduct>('Product', productSchema);
