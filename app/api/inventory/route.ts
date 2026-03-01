import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Inventory } from "@/lib/models/Inventory";
import { requireAuth } from "@/lib/auth";

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;

  try {
    await connectDB();
    const inventory = await Inventory.find({}).sort({ cylinderSize: 1 }).lean();
    return NextResponse.json(inventory);
  } catch (error) {
    console.error("Inventory GET error:", error);
    return NextResponse.json({ error: "Failed to fetch inventory" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const { error, session } = await requireAuth();
  if (error) return error;

  try {
    await connectDB();
    const body = await request.json();
    const { cylinderSize, fullStock, emptyStock, pricePerUnit } = body;

    // Managers cannot change pricePerUnit
    const update: Record<string, unknown> = { fullStock, emptyStock };
    if (session!.user.role === "admin") {
      update.pricePerUnit = pricePerUnit;
    }

    const inventory = await Inventory.findOneAndUpdate(
      { cylinderSize },
      update,
      { new: true }
    );

    if (!inventory) {
      return NextResponse.json({ error: "Inventory item not found" }, { status: 404 });
    }

    return NextResponse.json(inventory);
  } catch (error) {
    console.error("Inventory PUT error:", error);
    return NextResponse.json({ error: "Failed to update inventory" }, { status: 500 });
  }
}
