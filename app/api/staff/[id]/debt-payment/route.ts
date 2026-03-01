import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
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

    const staff = await Staff.findById(id);
    if (!staff) {
      return NextResponse.json({ error: "Staff not found" }, { status: 404 });
    }

    if (amount > staff.debtBalance) {
      return NextResponse.json({ error: "Amount exceeds debt balance" }, { status: 400 });
    }

    const payment = await DebtPayment.create({
      staff: id,
      amount,
      note: note || "",
      recordedBy: session!.user.id,
    });

    await Staff.findByIdAndUpdate(id, { $inc: { debtBalance: -amount } });

    return NextResponse.json(payment, { status: 201 });
  } catch (err) {
    console.error("DebtPayment POST error:", err);
    return NextResponse.json({ error: "Failed to record debt payment" }, { status: 500 });
  }
}
