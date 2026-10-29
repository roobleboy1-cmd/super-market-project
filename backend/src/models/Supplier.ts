import mongoose, { Document, Schema } from 'mongoose';

export interface ISupplier extends Document {
  name: string;
  companyName: string;
  email?: string;
  phone: string;
  address?: string;
  taxNumber?: string;
  paymentTerms?: string;
  balance: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const supplierSchema = new Schema<ISupplier>(
  {
    name: { type: String, required: true, trim: true },
    companyName: { type: String, required: true, trim: true, index: true },
    email: { type: String, trim: true, lowercase: true },
    phone: { type: String, required: true, trim: true },
    address: { type: String, trim: true },
    taxNumber: { type: String, trim: true },
    paymentTerms: { type: String, default: 'Net 30' },
    balance: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true, index: true }
  },
  {
    timestamps: true
  }
);

export const Supplier = mongoose.model<ISupplier>('Supplier', supplierSchema);
