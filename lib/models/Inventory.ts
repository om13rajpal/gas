import mongoose, { Schema, Document, Model } from "mongoose";

export interface IInventory extends Document {
  cylinderSize: "5kg" | "10kg" | "14kg" | "19kg";
  fullStock: number;
  emptyStock: number;
  pricePerUnit: number;
  updatedAt: Date;
}

const InventorySchema = new Schema<IInventory>(
  {
    cylinderSize: {
      type: String,
      enum: ["5kg", "10kg", "14kg", "19kg"],
      required: true,
      unique: true,
    },
    fullStock: { type: Number, default: 0, min: 0 },
    emptyStock: { type: Number, default: 0, min: 0 },
    pricePerUnit: { type: Number, required: true, min: 0 },
  },
  { timestamps: true }
);

export const Inventory: Model<IInventory> =
  mongoose.models.Inventory || mongoose.model<IInventory>("Inventory", InventorySchema);
