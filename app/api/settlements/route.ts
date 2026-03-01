import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Settlement } from "@/lib/models/Settlement";
import { Staff } from "@/lib/models/Staff";
import { Inventory } from "@/lib/models/Inventory";
import { requireAuth } from "@/lib/auth";

export async function GET(request: Request) {
  const { error } = await requireAuth();
  if (error) return error;

  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const staffId = searchParams.get("staffId");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    const query: Record<string, unknown> = {};
    if (staffId) query.staff = staffId;

    const [settlements, total] = await Promise.all([
      Settlement.find(query)
        .populate("staff", "name")
        .sort({ date: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Settlement.countDocuments(query),
    ]);

    return NextResponse.json({ settlements, total, page, pages: Math.ceil(total / limit) });
  } catch (error) {
    console.error("Settlements GET error:", error);
    return NextResponse.json({ error: "Failed to fetch settlements" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const { error, session } = await requireAuth();
  if (error) return error;

  try {
    await connectDB();
    const body = await request.json();

    const { staffId, date, items, addPayment, reducePayment, expenses, actualCash, notes } = body;

    // Calculate gross revenue
    let grossRevenue = 0;
    const processedItems = [];

    for (const item of items) {
      const inventory = await Inventory.findOne({ cylinderSize: item.cylinderSize });
      if (!inventory) {
        return NextResponse.json(
          { error: `Inventory not found for ${item.cylinderSize}` },
          { status: 400 }
        );
      }

      const pricePerUnit = inventory.pricePerUnit;
      const total = item.quantity * pricePerUnit;
      grossRevenue += total;

      processedItems.push({
        cylinderSize: item.cylinderSize,
        quantity: item.quantity,
        pricePerUnit,
        total,
      });

      // Update inventory: reduce full stock, increase empty stock
      await Inventory.findOneAndUpdate(
        { cylinderSize: item.cylinderSize },
        {
          $inc: {
            fullStock: -item.quantity,
            emptyStock: item.quantity,
          },
        }
      );
    }

    // Calculate expected cash and shortage
    const expectedCash = grossRevenue + (addPayment || 0) - (reducePayment || 0) - (expenses || 0);
    const shortage = Math.max(0, expectedCash - (actualCash || 0));

    const settlement = await Settlement.create({
      staff: staffId,
      date: new Date(date),
      items: processedItems,
      grossRevenue,
      addPayment: addPayment || 0,
      reducePayment: reducePayment || 0,
      expenses: expenses || 0,
      expectedCash,
      actualCash: actualCash || 0,
      shortage,
      notes: notes || "",
      denominations: body.denominations || [],
      denominationTotal: body.denominationTotal || 0,
      createdBy: session!.user.id,
    });

    // Update staff debt if shortage
    if (shortage > 0) {
      await Staff.findByIdAndUpdate(staffId, {
        $inc: { debtBalance: shortage },
      });
    }

    const populated = await Settlement.findById(settlement._id).populate("staff", "name");

    return NextResponse.json(populated, { status: 201 });
  } catch (error) {
    console.error("Settlement POST error:", error);
    return NextResponse.json({ error: "Failed to create settlement" }, { status: 500 });
  }
}
