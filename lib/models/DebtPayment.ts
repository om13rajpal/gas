import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IDebtPayment extends Document {
  staff: Types.ObjectId;
  amount: number;
  note: string;
  recordedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const DebtPaymentSchema = new Schema<IDebtPayment>(
  {
    staff: { type: Schema.Types.ObjectId, ref: "Staff", required: true },
    amount: { type: Number, required: true, min: 0 },
    note: { type: String, default: "" },
    recordedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

DebtPaymentSchema.index({ staff: 1, createdAt: -1 });

export const DebtPayment: Model<IDebtPayment> =
  mongoose.models.DebtPayment || mongoose.model<IDebtPayment>("DebtPayment", DebtPaymentSchema);
