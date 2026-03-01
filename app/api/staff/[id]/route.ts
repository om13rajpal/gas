import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Staff } from "@/lib/models/Staff";
import { requireAuth, requireAdmin } from "@/lib/auth";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAuth();
  if (error) return error;

  try {
    await connectDB();
    const { id } = await params;
    const staff = await Staff.findById(id).lean();
    if (!staff) return NextResponse.json({ error: "Staff not found" }, { status: 404 });
    return NextResponse.json(staff);
  } catch (error) {
    console.error("Staff GET error:", error);
    return NextResponse.json({ error: "Failed to fetch staff" }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAuth();
  if (error) return error;

  try {
    await connectDB();
    const { id } = await params;
    const body = await request.json();
    const staff = await Staff.findByIdAndUpdate(
      id,
      { name: body.name, phone: body.phone, address: body.address },
      { new: true }
    );
    if (!staff) return NextResponse.json({ error: "Staff not found" }, { status: 404 });
    return NextResponse.json(staff);
  } catch (error) {
    console.error("Staff PUT error:", error);
    return NextResponse.json({ error: "Failed to update staff" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    await connectDB();
    const { id } = await params;
    await Staff.findByIdAndUpdate(id, { isActive: false });
    return NextResponse.json({ message: "Staff deleted" });
  } catch (error) {
    console.error("Staff DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete staff" }, { status: 500 });
  }
}
