import { NextResponse } from "next/server";
import { connectDB, withTransaction } from "@/lib/db";
import { Settlement } from "@/lib/models/Settlement";
import { Staff } from "@/lib/models/Staff";
import { Inventory } from "@/lib/models/Inventory";
import { requireAuth } from "@/lib/auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAuth();
  if (error) return error;

  try {
    await connectDB();
    const { id } = await params;

    const settlement = await Settlement.findById(id)
      .populate("staff", "name phone")
      .populate("customer", "name phone")
      .lean();

    if (!settlement) {
      return NextResponse.json({ error: "Settlement not found" }, { status: 404 });
    }

    return NextResponse.json(settlement);
  } catch (error) {
    console.error("Settlement GET error:", error);
    return NextResponse.json({ error: "Failed to fetch settlement" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAuth();
  if (error) return error;

  try {
    await connectDB();
    const { id } = await params;
    const body = await request.json();
    const { date, items, addPayment, reducePayment, expenses, actualCash, notes, denominations, denominationTotal } = body;

    const result = await withTransaction(async (txSession) => {
      // Fetch the existing settlement
      const oldSettlement = await Settlement.findById(id).session(txSession);
      if (!oldSettlement) {
        throw new Error("Settlement not found");
      }

      // Step 1: Reverse old inventory changes (add back full, subtract empty)
      for (const oldItem of oldSettlement.items) {
        await Inventory.findOneAndUpdate(
          { cylinderSize: oldItem.cylinderSize },
          { $inc: { fullStock: oldItem.quantity, emptyStock: -oldItem.quantity } },
          { session: txSession }
        );
      }

      // Step 2: Reverse old debt (subtract old shortage from staff debtBalance)
      if (oldSettlement.shortage > 0) {
        await Staff.findByIdAndUpdate(
          oldSettlement.staff,
          { $inc: { debtBalance: -oldSettlement.shortage } },
          { session: txSession }
        );
      }

      // Step 3: Validate new stock levels and calculate new values
      let grossRevenue = 0;
      const processedItems = [];

      for (const item of items) {
        const inventory = await Inventory.findOne({ cylinderSize: item.cylinderSize }).session(txSession);
        if (!inventory) {
          throw new Error(`Inventory not found for ${item.cylinderSize}`);
        }

        if (inventory.fullStock < item.quantity) {
          throw new Error(
            `Insufficient stock for ${item.cylinderSize}: only ${inventory.fullStock} available, requested ${item.quantity}`
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
      }

      // Step 4: Apply new inventory changes (subtract full, add empty)
      for (const item of items) {
        await Inventory.findOneAndUpdate(
          { cylinderSize: item.cylinderSize },
          { $inc: { fullStock: -item.quantity, emptyStock: item.quantity } },
          { session: txSession }
        );
      }

      // Step 5: Recalculate settlement
      const expectedCash = grossRevenue + (addPayment || 0) - (reducePayment || 0) - (expenses || 0);
      const newShortage = Math.max(0, expectedCash - (actualCash || 0));

      // Step 6: Update the settlement
      const updated = await Settlement.findByIdAndUpdate(
        id,
        {
          date: new Date(date),
          items: processedItems,
          grossRevenue,
          addPayment: addPayment || 0,
          reducePayment: reducePayment || 0,
          expenses: expenses || 0,
          expectedCash,
          actualCash: actualCash || 0,
          shortage: newShortage,
          notes: notes || "",
          denominations: denominations || [],
          denominationTotal: denominationTotal || 0,
        },
        { new: true, session: txSession }
      );

      // Step 7: Apply new debt
      if (newShortage > 0) {
        await Staff.findByIdAndUpdate(
          oldSettlement.staff,
          { $inc: { debtBalance: newShortage } },
          { session: txSession }
        );
      }

      return updated;
    });

    const populated = await Settlement.findById(result!._id)
      .populate("staff", "name phone")
      .populate("customer", "name phone");

    return NextResponse.json(populated);
  } catch (error) {
    console.error("Settlement PUT error:", error);
    const message = error instanceof Error ? error.message : "Failed to update settlement";
    const status = message.includes("Insufficient stock") || message.includes("not found") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAuth();
  if (error) return error;

  try {
    await connectDB();
    const { id } = await params;

    await withTransaction(async (txSession) => {
      // Fetch the settlement
      const settlement = await Settlement.findById(id).session(txSession);
      if (!settlement) {
        throw new Error("Settlement not found");
      }

      // Step 1: Reverse inventory (add back full, subtract empty)
      for (const item of settlement.items) {
        await Inventory.findOneAndUpdate(
          { cylinderSize: item.cylinderSize },
          { $inc: { fullStock: item.quantity, emptyStock: -item.quantity } },
          { session: txSession }
        );
      }

      // Step 2: Reverse debt (subtract shortage from staff debtBalance)
      if (settlement.shortage > 0) {
        await Staff.findByIdAndUpdate(
          settlement.staff,
          { $inc: { debtBalance: -settlement.shortage } },
          { session: txSession }
        );
      }

      // Step 3: Delete the settlement
      await Settlement.findByIdAndDelete(id, { session: txSession });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Settlement DELETE error:", error);
    const message = error instanceof Error ? error.message : "Failed to delete settlement";
    const status = message.includes("not found") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
