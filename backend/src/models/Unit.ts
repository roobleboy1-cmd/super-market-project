import mongoose, { Document, Schema } from 'mongoose';

export interface IUnit extends Document {
  name: string;
  symbol: string;
  precision: number; // Decimal places allowed (e.g. 0 for pcs, 2 or 3 for kg)
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const unitSchema = new Schema<IUnit>(
  {
    name: { type: String, required: true, trim: true, unique: true },
    symbol: { type: String, required: true, trim: true, unique: true },
    precision: { type: Number, default: 0, min: 0, max: 4 },
    isActive: { type: Boolean, default: true, index: true }
  },
  {
    timestamps: true
  }
);

export const Unit = mongoose.model<IUnit>('Unit', unitSchema);
