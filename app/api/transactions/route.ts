import dbConnect from "@/lib/db";
import { Transaction } from "@/models/Transaction";
import { getCurrentUserId } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const userId = await getCurrentUserId();
    await dbConnect();
    const list = await Transaction.find(userId);
    return NextResponse.json(list, { status: 200 });
  } catch (error) {
    console.error("GET Transactions Error:", error);
    return NextResponse.json({ error: "Failed to fetch transactions" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId();
    await dbConnect();
    const { customerId, itemId, date, morningQuantity, eveningQuantity, totalPrice } = await request.json();

    if (!customerId || !itemId || !date) {
      return NextResponse.json(
        { error: "Customer, product, and date are required" },
        { status: 400 }
      );
    }

    const newTransaction = await Transaction.create({
      customerId: Number(customerId),
      itemId: Number(itemId),
      date,
      morningQuantity: Number(morningQuantity || 0),
      eveningQuantity: Number(eveningQuantity || 0),
      totalPrice: Number(totalPrice || 0)
    }, userId);

    return NextResponse.json(
      { success: true, data: newTransaction },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST Transaction Error:", error);
    return NextResponse.json({ error: "Failed to log transaction" }, { status: 500 });
  }
}
