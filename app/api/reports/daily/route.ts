import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Settlement } from "@/lib/models/Settlement";
import { requireAuth } from "@/lib/auth";
import { Staff } from "@/lib/models/Staff";

export async function GET(request: Request) {
  const { error } = await requireAuth();
  if (error) return error;

  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");

    const endDate = endDateParam ? new Date(endDateParam) : new Date();
    endDate.setHours(23, 59, 59, 999);

    const startDate = startDateParam
      ? new Date(startDateParam)
      : new Date(new Date().setDate(endDate.getDate() - 30));
    startDate.setHours(0, 0, 0, 0);

    // Fetch raw settlements with populated staff
    const settlements = await Settlement.find({
      date: { $gte: startDate, $lte: endDate },
    })
      .sort({ date: -1 })
      .lean();

    // Build staff name map
    const staffIds = new Set<string>();
    for (const s of settlements) {
      if (s.schemaVersion === 5 && s.staffEntries) {
        for (const entry of s.staffEntries) {
          if (entry.staff) staffIds.add(entry.staff.toString());
        }
      } else if (s.staff) {
        staffIds.add(s.staff.toString());
      }
    }

    const staffDocs = await Staff.find({
      _id: { $in: Array.from(staffIds) },
    }).lean();
    const staffNameMap = new Map<string, string>();
    for (const doc of staffDocs) {
      staffNameMap.set(doc._id.toString(), doc.name);
    }

    // Group settlements by date
    const dateMap = new Map<string, typeof settlements>();
    for (const s of settlements) {
      const dateKey = s.date.toISOString().split("T")[0];
      if (!dateMap.has(dateKey)) dateMap.set(dateKey, []);
      dateMap.get(dateKey)!.push(s);
    }

    interface StaffEntryDetail {
      staffName: string;
      items: { cylinderSize: string; quantity: number; pricePerUnit: number; total: number }[];
      grossRevenue: number;
      addOns: { category: string; amount: number; description?: string }[];
      deductions: { category: string; amount: number; description?: string }[];
      totalAddOns: number;
      totalDeductions: number;
      amountExpected: number;
      denominations: { note: number; count: number; total: number }[];
      denominationTotal: number;
      cashDifference: number;
    }

    const dailyReports = Array.from(dateMap.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([date, daySettlements]) => {
        const staffEntries: StaffEntryDetail[] = [];
        const allItems: { cylinderSize: string; quantity: number; pricePerUnit: number; total: number }[] = [];
        const allAddOns: { category: string; amount: number; description?: string }[] = [];
        const allDeductions: { category: string; amount: number; description?: string }[] = [];
        let grossCylinderRevenue = 0;
        let totalAdditionalIncome = 0;
        let totalExpenses = 0;
        const staffNamesSet = new Set<string>();

        for (const settlement of daySettlements) {
          if (settlement.schemaVersion === 5 && settlement.staffEntries) {
            for (const entry of settlement.staffEntries) {
              const staffName = entry.staff
                ? staffNameMap.get(entry.staff.toString()) || "Unknown"
                : "Unknown";
              staffNamesSet.add(staffName);

              const items = (entry.items || []).map((i) => ({
                cylinderSize: i.cylinderSize,
                quantity: i.quantity,
                pricePerUnit: i.pricePerUnit,
                total: i.total,
              }));

              const addOns = (entry.addOns || []).map((a) => ({
                category: a.category,
                amount: a.amount,
                ...(a.description ? { description: a.description } : {}),
              }));

              const deductions = (entry.deductions || []).map((d) => ({
                category: d.category,
                amount: d.amount,
                ...(d.description ? { description: d.description } : {}),
              }));

              const denominations = (entry.denominations || []).map((d) => ({
                note: d.note,
                count: d.count,
                total: d.total,
              }));

              staffEntries.push({
                staffName,
                items,
                grossRevenue: entry.grossRevenue || 0,
                addOns,
                deductions,
                totalAddOns: entry.totalAddOns || 0,
                totalDeductions: entry.totalDeductions || 0,
                amountExpected: entry.amountExpected || 0,
                denominations,
                denominationTotal: entry.denominationTotal || 0,
                cashDifference: entry.cashDifference || 0,
              });

              allItems.push(...items);
              allAddOns.push(...addOns);
              allDeductions.push(...deductions);
              grossCylinderRevenue += entry.grossRevenue || 0;
              totalAdditionalIncome += entry.totalAddOns || 0;
              totalExpenses += entry.totalDeductions || 0;
            }
          } else {
            // V3 settlement
            const staffName = settlement.staff
              ? staffNameMap.get(settlement.staff.toString()) || "Unknown"
              : "Unknown";
            staffNamesSet.add(staffName);

            const items = (settlement.items || []).map((i) => ({
              cylinderSize: i.cylinderSize,
              quantity: i.quantity,
              pricePerUnit: i.pricePerUnit,
              total: i.total,
            }));

            const addOns: { category: string; amount: number; description?: string }[] = [];
            const deductions: { category: string; amount: number; description?: string }[] = [];

            for (const t of settlement.transactions || []) {
              if (t.type === "credit") {
                addOns.push({
                  category: t.category,
                  amount: t.amount,
                  ...(t.note ? { description: t.note } : {}),
                });
              } else {
                deductions.push({
                  category: t.category,
                  amount: t.amount,
                  ...(t.note ? { description: t.note } : {}),
                });
              }
            }

            const v3AddOns = settlement.totalCredits ?? settlement.addPayment ?? 0;
            const v3Deductions =
              settlement.totalDebits ??
              (settlement.reducePayment || 0) + (settlement.expenses || 0);

            const denominations = (settlement.denominations || []).map((d) => ({
              note: d.note,
              count: d.count,
              total: d.total,
            }));

            staffEntries.push({
              staffName,
              items,
              grossRevenue: settlement.grossRevenue || 0,
              addOns,
              deductions,
              totalAddOns: v3AddOns,
              totalDeductions: v3Deductions,
              amountExpected:
                settlement.netRevenue ?? settlement.expectedCash ?? 0,
              denominations,
              denominationTotal: settlement.denominationTotal || 0,
              cashDifference: settlement.amountPending ?? settlement.shortage ?? 0,
            });

            allItems.push(...items);
            allAddOns.push(...addOns);
            allDeductions.push(...deductions);
            grossCylinderRevenue += settlement.grossRevenue || 0;
            totalAdditionalIncome += v3AddOns;
            totalExpenses += v3Deductions;
          }
        }

        // Aggregate cylinder sales by size+price
        const cylinderMap = new Map<
          string,
          { cylinderSize: string; quantity: number; pricePerUnit: number; total: number }
        >();
        for (const item of allItems) {
          const key = `${item.cylinderSize}:${item.pricePerUnit}`;
          const existing = cylinderMap.get(key);
          if (existing) {
            existing.quantity += item.quantity;
            existing.total += item.total;
          } else {
            cylinderMap.set(key, { ...item });
          }
        }

        const grossTotal = grossCylinderRevenue + totalAdditionalIncome;
        const netAmount = grossTotal - totalExpenses;

        return {
          date,
          cylinderSales: Array.from(cylinderMap.values()).sort((a, b) =>
            a.cylinderSize.localeCompare(b.cylinderSize)
          ),
          additionalItems: allAddOns,
          expenses: allDeductions,
          grossCylinderRevenue,
          totalAdditionalIncome,
          grossTotal,
          totalExpenses,
          netAmount,
          staffNames: Array.from(staffNamesSet),
          staffEntries,
        };
      });

    return NextResponse.json({ dailyReports });
  } catch (err) {
    console.error("Daily reports error:", err);
    return NextResponse.json(
      { error: "Failed to fetch daily report data" },
      { status: 500 }
    );
  }
}
