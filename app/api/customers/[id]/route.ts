import dbConnect from "@/lib/db";
import { Customer, DailyLog } from "@/models/Customer";
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
      return NextResponse.json({ error: "Customer ID is required" }, { status: 400 });
    }

    const { name, phone, address, morningQuantity, eveningQuantity, itemId, openingBalance } = await request.json();

    if (!name || !phone || !address) {
      return NextResponse.json(
        { error: "Name, phone number, and address are required" },
        { status: 400 }
      );
    }

    const updatedCustomer = await Customer.findByIdAndUpdate(id, {
      name: name.trim(),
      phone: phone.trim(),
      address: address.trim(),
      morningQuantity: morningQuantity !== undefined ? Number(morningQuantity) : 0,
      eveningQuantity: eveningQuantity !== undefined ? Number(eveningQuantity) : 0,
      itemId: itemId !== undefined && itemId !== null ? Number(itemId) : null,
      openingBalance: openingBalance !== undefined ? Number(openingBalance) : 0,
    }, userId);

    if (!updatedCustomer) {
      return NextResponse.json({ error: "Customer not found or already deleted" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updatedCustomer }, { status: 200 });
  } catch (error) {
    console.error("Customer PUT Error:", error);
    return NextResponse.json({ error: "Failed to update customer" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const userId = await getCurrentUserId();
    await dbConnect();
    
    // Await params object for Next.js App Router
    const resolvedParams = await params;
    const { id } = resolvedParams;

    if (!id) {
      return NextResponse.json({ error: "Customer ID is required" }, { status: 400 });
    }

    // 1. Delete associated daily logs first to prevent orphan logs
    await DailyLog.deleteMany({ customerId: id });

    // 2. Soft delete customer profile
    const deletedCustomer = await Customer.findByIdAndDelete(id, userId);

    if (!deletedCustomer) {
      return NextResponse.json({ error: "Customer not found or already deleted" }, { status: 404 });
    }

    return NextResponse.json(
      { success: true, message: "Customer and associated logs successfully deleted" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Customer DELETE Error:", error);
    return NextResponse.json({ error: "Failed to delete customer" }, { status: 500 });
  }
}
