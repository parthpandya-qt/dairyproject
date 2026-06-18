import dbConnect from "@/lib/db";
import { ExtraItem } from "@/models/ExtraItem";
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
      return NextResponse.json({ error: "Extra item ID is required" }, { status: 400 });
    }

    const { customerId, itemId, date, quantity, totalPrice, pricePerUnit } = await request.json();

    if (!customerId || !itemId || !date) {
      return NextResponse.json(
        { error: "Customer, product, and date are required" },
        { status: 400 }
      );
    }

    const updated = await ExtraItem.findByIdAndUpdate(id, {
      customerId: Number(customerId),
      itemId,
      date,
      quantity: Number(quantity || 0),
      totalPrice: Number(totalPrice || 0),
      pricePerUnit: pricePerUnit !== undefined && pricePerUnit !== null ? Number(pricePerUnit) : undefined
    }, userId);

    if (!updated) {
      return NextResponse.json({ error: "Extra item not found or unauthorized" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updated }, { status: 200 });
  } catch (error) {
    console.error("PUT ExtraItem Error:", error);
    return NextResponse.json({ error: "Failed to update extra item" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const userId = await getCurrentUserId();
    await dbConnect();
    
    const resolvedParams = await params;
    const { id } = resolvedParams;

    if (!id) {
      return NextResponse.json({ error: "Extra item ID is required" }, { status: 400 });
    }

    const deleted = await ExtraItem.findByIdAndDelete(id, userId);

    if (!deleted) {
      return NextResponse.json({ error: "Extra item not found or unauthorized" }, { status: 404 });
    }

    return NextResponse.json(
      { success: true, message: "Extra item successfully removed" },
      { status: 200 }
    );
  } catch (error) {
    console.error("DELETE ExtraItem Error:", error);
    return NextResponse.json({ error: "Failed to delete extra item" }, { status: 500 });
  }
}
