import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Settlement } from "@/lib/models/Settlement";
import { Inventory } from "@/lib/models/Inventory";
import { Staff } from "@/lib/models/Staff";

export async function GET(request: Request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get("date");

    const date = dateParam ? new Date(dateParam) : new Date();
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const [settlements, inventory, staffCount, totalDebt] = await Promise.all([
      Settlement.find({ date: { $gte: startOfDay, $lte: endOfDay } }).populate("staff", "name"),
      Inventory.find({}).lean(),
      Staff.countDocuments({ isActive: true }),
      Staff.aggregate([{ $match: { isActive: true } }, { $group: { _id: null, total: { $sum: "$debtBalance" } } }]),
    ]);

    const totalDeliveries = settlements.reduce(
      (acc, s) => acc + s.items.reduce((a, i) => a + i.quantity, 0),
      0
    );
    const totalRevenue = settlements.reduce((acc, s) => acc + s.grossRevenue, 0);
    const totalExpenses = settlements.reduce((acc, s) => acc + s.expenses, 0);
    const totalShortage = settlements.reduce((acc, s) => acc + s.shortage, 0);
    const totalActualCash = settlements.reduce((acc, s) => acc + s.actualCash, 0);

    return NextResponse.json({
      stats: {
        totalDeliveries,
        totalRevenue,
        totalExpenses,
        totalShortage,
        totalActualCash,
        staffCount,
        totalDebt: totalDebt[0]?.total || 0,
      },
      inventory,
      recentSettlements: settlements.slice(0, 10),
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    return NextResponse.json({ error: "Failed to fetch dashboard data" }, { status: 500 });
  }
}
