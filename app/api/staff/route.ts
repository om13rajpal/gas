import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Staff } from "@/lib/models/Staff";

export async function GET() {
  try {
    await connectDB();
    const staff = await Staff.find({ isActive: true }).sort({ name: 1 }).lean();
    return NextResponse.json(staff);
  } catch (error) {
    console.error("Staff GET error:", error);
    return NextResponse.json({ error: "Failed to fetch staff" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await connectDB();
    const body = await request.json();
    const staff = await Staff.create({
      name: body.name,
      phone: body.phone || "",
      address: body.address || "",
    });
    return NextResponse.json(staff, { status: 201 });
  } catch (error) {
    console.error("Staff POST error:", error);
    return NextResponse.json({ error: "Failed to create staff" }, { status: 500 });
  }
}
