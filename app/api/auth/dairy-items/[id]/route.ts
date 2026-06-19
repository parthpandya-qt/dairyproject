import { dbConnect } from "@/lib/db";
import DairyItem from "@/models/DairyItem";
import { getCurrentUserId } from "@/lib/auth";
import { NextResponse } from "next/server";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const userId = await getCurrentUserId();
    await dbConnect();
    const resolvedParams = await params;
    const { id } = resolvedParams;

    if (!id) {
      return NextResponse.json({ error: "Item ID is required" }, { status: 400 });
    }

    const { name, pricePerUnit, unit } = await request.json();

    if (!name || pricePerUnit === undefined || !unit) {
      return NextResponse.json(
        { error: "Name, price per unit, and unit are required" },
        { status: 400 }
      );
    }

    const updatedItem = await DairyItem.findByIdAndUpdate(id, {
      name: name.trim(),
      pricePerUnit: Number(pricePerUnit),
      unit,
    }, userId);

    if (!updatedItem) {
      return NextResponse.json({ error: "Dairy item not found or already deleted" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updatedItem }, { status: 200 });
  } catch (error) {
    console.error("Dairy Item PUT Error:", error);
    return NextResponse.json({ error: "Failed to update dairy item" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const userId = await getCurrentUserId();
    await dbConnect();
    
    const resolvedParams = await params;
    const { id } = resolvedParams;

    if (!id) {
      return NextResponse.json({ error: "Item ID parameter is missing" }, { status: 400 });
    }

    const deletedItem = await DairyItem.findByIdAndDelete(id, userId);

    if (!deletedItem) {
      return NextResponse.json({ error: "Target dairy item not found or already deleted" }, { status: 404 });
    }

    return NextResponse.json(
      { success: true, message: "Item successfully soft deleted" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Dairy Item DELETE Error:", error);
    return NextResponse.json({ error: "Failed to delete target item" }, { status: 500 });
  }
}