import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Category } from "@/lib/models/Category";
import { Settlement } from "@/lib/models/Settlement";
import { requireAuth } from "@/lib/auth";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAuth();
  if (error) return error;

  try {
    await connectDB();
    const { id } = await params;
    const { name } = await request.json();

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const category = await Category.findById(id);
    if (!category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    const oldName = category.name;
    const newName = name.trim();

    if (oldName === newName) {
      return NextResponse.json(category);
    }

    // Check for duplicate name+type
    const existing = await Category.findOne({ name: newName, type: category.type });
    if (existing) {
      return NextResponse.json({ error: "A category with this name already exists" }, { status: 400 });
    }

    // Cascade rename across settlements
    if (category.type === "addon") {
      // V5: staffEntries.addOns.category
      await Settlement.updateMany(
        { "staffEntries.addOns.category": oldName },
        { $set: { "staffEntries.$[].addOns.$[ao].category": newName } },
        { arrayFilters: [{ "ao.category": oldName }] }
      );
      // V3: transactions.category (credit type)
      await Settlement.updateMany(
        { "transactions.category": oldName, "transactions.type": "credit" },
        { $set: { "transactions.$[t].category": newName } },
        { arrayFilters: [{ "t.category": oldName, "t.type": "credit" }] }
      );
    } else {
      // V5: staffEntries.deductions.category
      await Settlement.updateMany(
        { "staffEntries.deductions.category": oldName },
        { $set: { "staffEntries.$[].deductions.$[ded].category": newName } },
        { arrayFilters: [{ "ded.category": oldName }] }
      );
      // V3: transactions.category (debit type)
      await Settlement.updateMany(
        { "transactions.category": oldName, "transactions.type": "debit" },
        { $set: { "transactions.$[t].category": newName } },
        { arrayFilters: [{ "t.category": oldName, "t.type": "debit" }] }
      );
    }

    category.name = newName;
    await category.save();

    return NextResponse.json(category);
  } catch (error) {
    console.error("Category PUT error:", error);
    return NextResponse.json({ error: "Failed to update category" }, { status: 500 });
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

    const category = await Category.findById(id);
    if (!category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    // Check usage in settlements
    let usageCount = 0;

    if (category.type === "addon") {
      usageCount += await Settlement.countDocuments({
        "staffEntries.addOns.category": category.name,
      });
      usageCount += await Settlement.countDocuments({
        "transactions.category": category.name,
        "transactions.type": "credit",
      });
    } else {
      usageCount += await Settlement.countDocuments({
        "staffEntries.deductions.category": category.name,
      });
      usageCount += await Settlement.countDocuments({
        "transactions.category": category.name,
        "transactions.type": "debit",
      });
    }

    if (usageCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete: category is used in ${usageCount} settlement(s)` },
        { status: 400 }
      );
    }

    await Category.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Category DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete category" }, { status: 500 });
  }
}
