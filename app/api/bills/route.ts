import { dbConnect } from "@/lib/db";
import { Bill } from "@/models/Bill";
import { getCurrentUserId } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const userId = await getCurrentUserId();
    await dbConnect();
    const list = await Bill.find(userId);
    return NextResponse.json(list, { status: 200 });
  } catch (error) {
    console.error("GET Bills Error:", error);
    return NextResponse.json({ error: "Failed to fetch bills" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId();
    await dbConnect();
    const {
      customerId,
      billingMonth,
      openingBalance,
      deliveriesTotal,
      totalAmount,
      paidAmount,
      status
    } = await request.json();

    if (!customerId || !billingMonth) {
      return NextResponse.json(
        { error: "Customer and billing month are required" },
        { status: 400 }
      );
    }

    const newBill = await Bill.create({
      customerId: Number(customerId),
      billingMonth,
      openingBalance: Number(openingBalance || 0),
      deliveriesTotal: Number(deliveriesTotal || 0),
      totalAmount: Number(totalAmount || 0),
      paidAmount: Number(paidAmount || 0),
      status
    }, userId);

    return NextResponse.json(
      { success: true, data: newBill },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST Bill Error:", error);
    return NextResponse.json({ error: "Failed to save bill" }, { status: 500 });
  }
}
