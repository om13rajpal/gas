import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Staff } from "@/lib/models/Staff";
import { Settlement } from "@/lib/models/Settlement";
import { DebtPayment } from "@/lib/models/DebtPayment";
import { requireAuth } from "@/lib/auth";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAuth();
  if (error) return error;

  try {
    await connectDB();
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    const [staff, settlements, settlementTotal, debtPayments] = await Promise.all([
      Staff.findById(id).lean(),
      Settlement.find({ staff: id })
        .sort({ date: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Settlement.countDocuments({ staff: id }),
      DebtPayment.find({ staff: id }).sort({ createdAt: -1 }).lean(),
    ]);

    if (!staff) {
      return NextResponse.json({ error: "Staff not found" }, { status: 404 });
    }

    return NextResponse.json({
      staff,
      settlements,
      debtPayments,
      pagination: {
        page,
        limit,
        total: settlementTotal,
        pages: Math.ceil(settlementTotal / limit),
      },
    });
  } catch (error) {
    console.error("Ledger error:", error);
    return NextResponse.json({ error: "Failed to fetch ledger" }, { status: 500 });
  }
}
