import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Settlement } from "@/lib/models/Settlement";
import { Staff } from "@/lib/models/Staff";
import { requireAuth } from "@/lib/auth";

export async function GET(request: Request) {
  const { error } = await requireAuth();
  if (error) return error;

  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");

    // Default: last 30 days
    const endDate = endDateParam ? new Date(endDateParam) : new Date();
    endDate.setHours(23, 59, 59, 999);

    const startDate = startDateParam
      ? new Date(startDateParam)
      : new Date(new Date().setDate(endDate.getDate() - 30));
    startDate.setHours(0, 0, 0, 0);

    const dateFilter = { date: { $gte: startDate, $lte: endDate } };

    // Run all aggregations in parallel
    const [summaryResult, staffBreakdown, cylinderBreakdown, dailyTrends] =
      await Promise.all([
        // Summary aggregation
        Settlement.aggregate([
          { $match: dateFilter },
          {
            $group: {
              _id: null,
              totalSettlements: { $sum: 1 },
              totalRevenue: { $sum: "$grossRevenue" },
              totalExpenses: { $sum: "$expenses" },
              totalShortage: { $sum: "$shortage" },
              totalActualCash: { $sum: "$actualCash" },
              totalDeliveries: {
                $sum: { $sum: "$items.quantity" },
              },
            },
          },
        ]),

        // Staff breakdown with $lookup
        Settlement.aggregate([
          { $match: dateFilter },
          {
            $group: {
              _id: "$staff",
              settlementCount: { $sum: 1 },
              totalRevenue: { $sum: "$grossRevenue" },
              totalExpenses: { $sum: "$expenses" },
              totalShortage: { $sum: "$shortage" },
              totalDeliveries: {
                $sum: { $sum: "$items.quantity" },
              },
            },
          },
          {
            $lookup: {
              from: "staffs",
              localField: "_id",
              foreignField: "_id",
              as: "staffInfo",
            },
          },
          { $unwind: { path: "$staffInfo", preserveNullAndEmptyArrays: true } },
          {
            $project: {
              staffId: "$_id",
              staffName: { $ifNull: ["$staffInfo.name", "Unknown"] },
              settlementCount: 1,
              totalRevenue: 1,
              totalExpenses: 1,
              totalShortage: 1,
              totalDeliveries: 1,
            },
          },
          { $sort: { totalRevenue: -1 } },
        ]),

        // Cylinder breakdown using $unwind
        Settlement.aggregate([
          { $match: dateFilter },
          { $unwind: "$items" },
          {
            $group: {
              _id: "$items.cylinderSize",
              totalQuantity: { $sum: "$items.quantity" },
              totalRevenue: { $sum: "$items.total" },
            },
          },
          {
            $project: {
              cylinderSize: "$_id",
              totalQuantity: 1,
              totalRevenue: 1,
            },
          },
          { $sort: { cylinderSize: 1 } },
        ]),

        // Daily trends
        Settlement.aggregate([
          { $match: dateFilter },
          {
            $group: {
              _id: {
                $dateToString: { format: "%Y-%m-%d", date: "$date" },
              },
              revenue: { $sum: "$grossRevenue" },
              deliveries: { $sum: { $sum: "$items.quantity" } },
              settlements: { $sum: 1 },
            },
          },
          {
            $project: {
              date: "$_id",
              revenue: 1,
              deliveries: 1,
              settlements: 1,
            },
          },
          { $sort: { date: 1 } },
        ]),
      ]);

    const summary = summaryResult[0] || {
      totalSettlements: 0,
      totalRevenue: 0,
      totalExpenses: 0,
      totalShortage: 0,
      totalActualCash: 0,
      totalDeliveries: 0,
    };

    return NextResponse.json({
      summary,
      staffBreakdown,
      cylinderBreakdown,
      dailyTrends,
    });
  } catch (error) {
    console.error("Reports error:", error);
    return NextResponse.json(
      { error: "Failed to fetch report data" },
      { status: 500 }
    );
  }
}
