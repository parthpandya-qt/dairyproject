import { dbConnect } from "@/lib/db";
import { ExtraItem } from "@/models/ExtraItem";
import { getCurrentUserId } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const userId = await getCurrentUserId();
    await dbConnect();
    const list = await ExtraItem.find(userId);
    return NextResponse.json(list, { status: 200 });
  } catch (error) {
    console.error("GET ExtraItems Error:", error);
    return NextResponse.json({ error: "Failed to fetch extra items" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId();
    await dbConnect();
    const { customerId, itemId, date, quantity, totalPrice, pricePerUnit } = await request.json();

    if (!customerId || !itemId || !date) {
      return NextResponse.json(
        { error: "Customer, product, and date are required" },
        { status: 400 }
      );
    }

    const newExtraItem = await ExtraItem.create({
      customerId: Number(customerId),
      itemId,
      date,
      quantity: Number(quantity || 0),
      totalPrice: Number(totalPrice || 0),
      pricePerUnit: pricePerUnit !== undefined && pricePerUnit !== null ? Number(pricePerUnit) : undefined
    }, userId);

    return NextResponse.json(
      { success: true, data: newExtraItem },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST ExtraItem Error:", error);
    return NextResponse.json({ error: "Failed to log extra item" }, { status: 500 });
  }
}
