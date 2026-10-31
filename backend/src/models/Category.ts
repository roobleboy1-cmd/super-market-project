import mongoose, { Document, Schema } from 'mongoose';

export interface ICategory extends Document {
  name: string;
  code: string;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const categorySchema = new Schema<ICategory>(
  {
    name: { type: String, required: true, trim: true, unique: true },
    code: { type: String, required: true, trim: true, uppercase: true, unique: true },
    description: { type: String, trim: true },
    isActive: { type: Boolean, default: true, index: true }
  },
  {
    timestamps: true
  }
);

export const Category = mongoose.model<ICategory>('Category', categorySchema);
