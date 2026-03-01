import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Inventory } from "@/lib/models/Inventory";

export async function GET() {
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
  try {
    await connectDB();
    const body = await request.json();
    const { cylinderSize, fullStock, emptyStock, pricePerUnit } = body;

    const inventory = await Inventory.findOneAndUpdate(
      { cylinderSize },
      { fullStock, emptyStock, pricePerUnit },
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
