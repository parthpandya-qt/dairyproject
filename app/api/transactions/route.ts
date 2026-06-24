import { dbConnect, query } from "@/lib/db";
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
    const body = await request.json();

    // Support bulk operations if an array is passed
    if (Array.isArray(body)) {
      const results = [];
      for (const item of body) {
        const { customerId, itemId, date, morningQuantity, eveningQuantity, totalPrice, pricePerUnit } = item;

        if (!customerId || !itemId || !date) {
          continue; // Skip invalid elements in bulk request
        }

        // Check if transaction already exists for customerId + date + userId
        const existing = await query(
          "SELECT id FROM transactions WHERE customerId = ? AND date = ? AND userId = ? LIMIT 1",
          [Number(customerId), date, userId]
        );

        let tx;
        if (existing && existing.length > 0) {
          tx = await Transaction.findByIdAndUpdate(
            existing[0].id.toString(),
            {
              customerId: Number(customerId),
              itemId,
              date,
              morningQuantity: Number(morningQuantity || 0),
              eveningQuantity: Number(eveningQuantity || 0),
              totalPrice: Number(totalPrice || 0),
              pricePerUnit: pricePerUnit !== undefined && pricePerUnit !== null ? Number(pricePerUnit) : undefined,
            },
            userId
          );
        } else {
          tx = await Transaction.create(
            {
              customerId: Number(customerId),
              itemId,
              date,
              morningQuantity: Number(morningQuantity || 0),
              eveningQuantity: Number(eveningQuantity || 0),
              totalPrice: Number(totalPrice || 0),
              pricePerUnit: pricePerUnit !== undefined && pricePerUnit !== null ? Number(pricePerUnit) : undefined,
            },
            userId
          );
        }
        results.push(tx);
      }

      return NextResponse.json(
        { success: true, count: results.length, data: results },
        { status: 200 }
      );
    }

    // Single transaction fallback
    const { customerId, itemId, date, morningQuantity, eveningQuantity, totalPrice, pricePerUnit } = body;

    if (!customerId || !itemId || !date) {
      return NextResponse.json(
        { error: "Customer, product, and date are required" },
        { status: 400 }
      );
    }

    const newTransaction = await Transaction.create({
      customerId: Number(customerId),
      itemId,
      date,
      morningQuantity: Number(morningQuantity || 0),
      eveningQuantity: Number(eveningQuantity || 0),
      totalPrice: Number(totalPrice || 0),
      pricePerUnit: pricePerUnit !== undefined && pricePerUnit !== null ? Number(pricePerUnit) : undefined
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
