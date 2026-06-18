import dbConnect from "@/lib/db";
import { Transaction } from "@/models/Transaction";
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
      return NextResponse.json({ error: "Transaction ID is required" }, { status: 400 });
    }

    const { customerId, itemId, date, morningQuantity, eveningQuantity, totalPrice, pricePerUnit } = await request.json();

    if (!customerId || !itemId || !date) {
      return NextResponse.json(
        { error: "Customer, product, and date are required" },
        { status: 400 }
      );
    }

    const updated = await Transaction.findByIdAndUpdate(id, {
      customerId: Number(customerId),
      itemId,
      date,
      morningQuantity: Number(morningQuantity || 0),
      eveningQuantity: Number(eveningQuantity || 0),
      totalPrice: Number(totalPrice || 0),
      pricePerUnit: pricePerUnit !== undefined && pricePerUnit !== null ? Number(pricePerUnit) : undefined
    }, userId);

    if (!updated) {
      return NextResponse.json({ error: "Transaction not found or unauthorized" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updated }, { status: 200 });
  } catch (error) {
    console.error("PUT Transaction Error:", error);
    return NextResponse.json({ error: "Failed to update transaction" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const userId = await getCurrentUserId();
    await dbConnect();
    
    const resolvedParams = await params;
    const { id } = resolvedParams;

    if (!id) {
      return NextResponse.json({ error: "Transaction ID is required" }, { status: 400 });
    }

    const deleted = await Transaction.findByIdAndDelete(id, userId);

    if (!deleted) {
      return NextResponse.json({ error: "Transaction not found or unauthorized" }, { status: 404 });
    }

    return NextResponse.json(
      { success: true, message: "Transaction successfully removed" },
      { status: 200 }
    );
  } catch (error) {
    console.error("DELETE Transaction Error:", error);
    return NextResponse.json({ error: "Failed to delete transaction" }, { status: 500 });
  }
}
