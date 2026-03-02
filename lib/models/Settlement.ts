import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface ISettlementItem {
  cylinderSize: "5kg" | "10kg" | "14kg" | "19kg";
  quantity: number;
  pricePerUnit: number;
  total: number;
}

export interface IDenomination {
  note: number;
  count: number;
  total: number;
}

export interface ISettlement extends Document {
  staff: Types.ObjectId;
  customer?: Types.ObjectId;
  date: Date;
  items: ISettlementItem[];
  grossRevenue: number;
  addPayment: number;
  reducePayment: number;
  expenses: number;
  expectedCash: number;
  actualCash: number;
  shortage: number;
  notes: string;
  denominations: IDenomination[];
  denominationTotal: number;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const SettlementItemSchema = new Schema<ISettlementItem>(
  {
    cylinderSize: { type: String, enum: ["5kg", "10kg", "14kg", "19kg"], required: true },
    quantity: { type: Number, required: true, min: 0 },
    pricePerUnit: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true },
  },
  { _id: false }
);

const SettlementSchema = new Schema<ISettlement>(
  {
    staff: { type: Schema.Types.ObjectId, ref: "Staff", required: true },
    customer: { type: Schema.Types.ObjectId, ref: "Customer" },
    date: { type: Date, required: true },
    items: [SettlementItemSchema],
    grossRevenue: { type: Number, default: 0 },
    addPayment: { type: Number, default: 0 },
    reducePayment: { type: Number, default: 0 },
    expenses: { type: Number, default: 0 },
    expectedCash: { type: Number, default: 0 },
    actualCash: { type: Number, default: 0 },
    shortage: { type: Number, default: 0 },
    notes: { type: String, default: "" },
    denominations: [{
      note: { type: Number, required: true },
      count: { type: Number, required: true },
      total: { type: Number, required: true },
    }],
    denominationTotal: { type: Number, default: 0 },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

SettlementSchema.index({ staff: 1, date: -1 });
SettlementSchema.index({ date: -1 });

export const Settlement: Model<ISettlement> =
  mongoose.models.Settlement || mongoose.model<ISettlement>("Settlement", SettlementSchema);
