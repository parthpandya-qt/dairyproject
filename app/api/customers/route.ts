import { dbConnect } from "@/lib/db";
import { Customer } from "@/models/Customer";
import { getCurrentUserId } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const userId = await getCurrentUserId();
    await dbConnect();
    const customers = await Customer.find(userId);
    return NextResponse.json(customers, { status: 200 });
  } catch (error) {
    console.error("Failed to fetch customers:", error);
    return NextResponse.json({ error: "Failed to fetch customers" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId();
    await dbConnect();
    const { name, phone, address, morningQuantity, eveningQuantity, itemId, openingBalance } = await request.json();

    if (!name || !phone || !address) {
      return NextResponse.json(
        { error: "Name, phone number, and address are required" },
        { status: 400 }
      );
    }

    const newCustomer = await Customer.create({
      name: name.trim(),
      phone: phone.trim(),
      address: address.trim(),
      morningQuantity: morningQuantity !== undefined ? Number(morningQuantity) : 0,
      eveningQuantity: eveningQuantity !== undefined ? Number(eveningQuantity) : 0,
      itemId: itemId !== undefined && itemId !== null ? itemId : null,
      openingBalance: openingBalance !== undefined ? Number(openingBalance) : 0,
    }, userId);

    return NextResponse.json(
      { success: true, data: newCustomer },
      { status: 201 }
    );
  } catch (error) {
    console.error("Customer POST Error:", error);
    return NextResponse.json({ error: "Failed to create customer" }, { status: 500 });
  }
}
