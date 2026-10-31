import mongoose, { Document, Schema } from 'mongoose';

export type CashMovementType = 'PAY_IN' | 'PAY_OUT' | 'DROP';

export interface ICashMovement extends Document {
  shiftId: mongoose.Types.ObjectId;
  movementType: CashMovementType;
  amount: number;
  reason: string;
  performedBy: mongoose.Types.ObjectId;
  authorizedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const cashMovementSchema = new Schema<ICashMovement>(
  {
    shiftId: { type: Schema.Types.ObjectId, ref: 'CashierShift', required: true, index: true },
    movementType: {
      type: String,
      enum: ['PAY_IN', 'PAY_OUT', 'DROP'],
      required: true,
      index: true
    },
    amount: { type: Number, required: true, min: 0.01 },
    reason: { type: String, required: true, trim: true },
    performedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    authorizedBy: { type: Schema.Types.ObjectId, ref: 'User' }
  },
  {
    timestamps: true
  }
);

export const CashMovement = mongoose.model<ICashMovement>('CashMovement', cashMovementSchema);
