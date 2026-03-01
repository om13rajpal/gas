import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Staff } from "@/lib/models/Staff";
import { Settlement } from "@/lib/models/Settlement";
import { DebtPayment } from "@/lib/models/DebtPayment";
import { requireAuth } from "@/lib/auth";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAuth();
  if (error) return error;

  try {
    await connectDB();
    const { id } = await params;

    const [staff, settlements, debtPayments] = await Promise.all([
      Staff.findById(id).lean(),
      Settlement.find({ staff: id }).sort({ date: -1 }).lean(),
      DebtPayment.find({ staff: id }).sort({ createdAt: -1 }).lean(),
    ]);

    if (!staff) {
      return NextResponse.json({ error: "Staff not found" }, { status: 404 });
    }

    return NextResponse.json({ staff, settlements, debtPayments });
  } catch (error) {
    console.error("Ledger error:", error);
    return NextResponse.json({ error: "Failed to fetch ledger" }, { status: 500 });
  }
}
