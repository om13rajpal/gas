import mongoose, { Schema, Document, Model } from "mongoose";

export interface ITelegramSession extends Document {
  chatId: number;
  step: string;
  data: Record<string, unknown>;
  expiresAt: Date;
}

const TelegramSessionSchema = new Schema<ITelegramSession>({
  chatId: { type: Number, required: true, unique: true },
  step: { type: String, required: true },
  data: { type: Schema.Types.Mixed, default: {} },
  expiresAt: { type: Date, default: () => new Date(Date.now() + 60 * 60 * 1000) },
});

TelegramSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const TelegramSession: Model<ITelegramSession> =
  mongoose.models.TelegramSession || mongoose.model<ITelegramSession>("TelegramSession", TelegramSessionSchema);
