import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Settlement } from "@/lib/models/Settlement";
import { Inventory } from "@/lib/models/Inventory";
import { Staff } from "@/lib/models/Staff";
import { requireAuth } from "@/lib/auth";

const LOW_STOCK_THRESHOLD = parseInt(process.env.LOW_STOCK_THRESHOLD || "10");

export async function GET(request: Request) {
  const { error } = await requireAuth();
  if (error) return error;

  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get("date");

    // Use IST timezone for date calculations
    const istOffset = 5.5 * 60 * 60 * 1000;
    let istDateStr: string;

    if (dateParam) {
      istDateStr = dateParam;
    } else {
      const now = new Date();
      const istNow = new Date(now.getTime() + istOffset);
      istDateStr = istNow.toISOString().split("T")[0];
    }

    const startOfDay = new Date(istDateStr + "T00:00:00.000+05:30");
    const endOfDay = new Date(istDateStr + "T23:59:59.999+05:30");

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

    // Low stock alerts
    const lowStockAlerts = inventory
      .filter((item) => item.fullStock < LOW_STOCK_THRESHOLD)
      .map((item) => ({
        cylinderSize: item.cylinderSize,
        fullStock: item.fullStock,
        threshold: LOW_STOCK_THRESHOLD,
      }));

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
      lowStockAlerts,
      date: istDateStr,
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    return NextResponse.json({ error: "Failed to fetch dashboard data" }, { status: 500 });
  }
}
