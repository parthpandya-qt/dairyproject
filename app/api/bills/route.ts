import { dbConnect, query } from "@/lib/db";
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

    // Check if bill already exists for this customer and month
    const existing = await query(`
      SELECT id, paidAmount FROM bills 
      WHERE customerId = ? AND billingMonth = ? AND userId = ?
      LIMIT 1
    `, [Number(customerId), billingMonth, userId]);

    if (existing && existing.length > 0) {
      const existingBill = existing[0];
      const newDeliveriesTotal = Number(deliveriesTotal || 0);
      const newOpeningBalance = Number(openingBalance || 0);
      const newTotalAmount = newOpeningBalance + newDeliveriesTotal;
      const currentPaid = Number(existingBill.paidAmount || 0);
      
      // Calculate new status based on newTotalAmount vs currentPaid
      const newStatus = currentPaid >= newTotalAmount ? "Paid" : (currentPaid > 0 ? "Partially Paid" : "Unpaid");

      // Update existing bill record
      await query(`
        UPDATE bills
        SET openingBalance = ?, deliveriesTotal = ?, totalAmount = ?, status = ?
        WHERE id = ? AND userId = ?
      `, [newOpeningBalance, newDeliveriesTotal, newTotalAmount, newStatus, existingBill.id, userId]);

      // Sync customer opening balance (outstanding unpaid balance)
      const remaining = Math.max(0, newTotalAmount - currentPaid);
      await query(`
        UPDATE customers
        SET openingBalance = ?
        WHERE id = ? AND userId = ?
      `, [remaining, Number(customerId), userId]);

      return NextResponse.json(
        { success: true, message: "Bill updated successfully", data: { _id: existingBill.id.toString(), id: existingBill.id } },
        { status: 200 }
      );
    }

    // Otherwise, create new bill
    const newBill = await Bill.create({
      customerId: Number(customerId),
      billingMonth,
      openingBalance: Number(openingBalance || 0),
      deliveriesTotal: Number(deliveriesTotal || 0),
      totalAmount: Number(totalAmount || 0),
      paidAmount: Number(paidAmount || 0),
      status: status || "Unpaid"
    }, userId);

    // Sync customer opening balance (outstanding unpaid balance)
    const remaining = Math.max(0, Number(totalAmount || 0) - Number(paidAmount || 0));
    await query(`
      UPDATE customers
      SET openingBalance = ?
      WHERE id = ? AND userId = ?
    `, [remaining, Number(customerId), userId]);

    return NextResponse.json(
      { success: true, data: newBill },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST Bill Error:", error);
    return NextResponse.json({ error: "Failed to save bill" }, { status: 500 });
  }
}
