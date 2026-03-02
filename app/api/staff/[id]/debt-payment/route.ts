import { NextResponse } from "next/server";
import { connectDB, withTransaction } from "@/lib/db";
import { Staff } from "@/lib/models/Staff";
import { DebtPayment } from "@/lib/models/DebtPayment";
import { requireAuth } from "@/lib/auth";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAuth();
  if (error) return error;

  try {
    await connectDB();
    const { id } = await params;
    const payments = await DebtPayment.find({ staff: id }).sort({ createdAt: -1 }).lean();
    return NextResponse.json(payments);
  } catch (err) {
    console.error("DebtPayment GET error:", err);
    return NextResponse.json({ error: "Failed to fetch debt payments" }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await requireAuth();
  if (error) return error;

  try {
    await connectDB();
    const { id } = await params;
    const body = await request.json();
    const { amount, note } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Amount must be greater than 0" }, { status: 400 });
    }

    const payment = await withTransaction(async (txSession) => {
      const staff = await Staff.findById(id).session(txSession);
      if (!staff) {
        throw new Error("Staff not found");
      }

      if (amount > staff.debtBalance) {
        throw new Error("Amount exceeds debt balance");
      }

      const [p] = await DebtPayment.create(
        [
          {
            staff: id,
            amount,
            note: note || "",
            recordedBy: session!.user.id,
          },
        ],
        { session: txSession }
      );

      await Staff.findByIdAndUpdate(id, { $inc: { debtBalance: -amount } }, { session: txSession });

      return p;
    });

    return NextResponse.json(payment, { status: 201 });
  } catch (err) {
    console.error("DebtPayment POST error:", err);
    const message = err instanceof Error ? err.message : "Failed to record debt payment";
    const status = message.includes("not found") ? 404 : message.includes("exceeds") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
