import dbConnect from "@/lib/db";
import { Customer } from "@/models/Customer";
import { getCurrentUserId } from "@/lib/auth";
import { NextResponse } from "next/server";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const userId = await getCurrentUserId();
    await dbConnect();
    
    const resolvedParams = await params;
    const { id } = resolvedParams;

    if (!id) {
      return NextResponse.json({ error: "Customer ID is required" }, { status: 400 });
    }

    const customer = await Customer.findById(id, userId);

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    return NextResponse.json(customer, { status: 200 });
  } catch (error) {
    console.error("Customer GET Error:", error);
    return NextResponse.json({ error: "Failed to fetch customer profile" }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const userId = await getCurrentUserId();
    await dbConnect();
    
    // Await params object for Next.js App Router
    const resolvedParams = await params;
    const { id } = resolvedParams;

    if (!id) {
      return NextResponse.json({ error: "Customer ID is required" }, { status: 400 });
    }

    const { name, phone, address, morningQuantity, eveningQuantity, itemId, openingBalance } = await request.json();

    const updatedCustomer = await Customer.findByIdAndUpdate(
      id,
      {
        name,
        phone,
        address,
        morningQuantity: morningQuantity !== undefined ? Number(morningQuantity) : 0,
        eveningQuantity: eveningQuantity !== undefined ? Number(eveningQuantity) : 0,
        itemId: itemId || null,
        openingBalance: openingBalance !== undefined ? Number(openingBalance) : 0
      },
      userId
    );

    if (!updatedCustomer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    return NextResponse.json(
      { success: true, message: "Customer updated successfully", data: updatedCustomer },
      { status: 200 }
    );
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

    // 1. Soft delete customer profile (associated transactions will cascade delete in DB if hard deleted, or are handled by design)
    const deletedCustomer = await Customer.findByIdAndDelete(id, userId);

    if (!deletedCustomer) {
      return NextResponse.json({ error: "Customer not found or already deleted" }, { status: 404 });
    }

    return NextResponse.json(
      { success: true, message: "Customer successfully deleted" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Customer DELETE Error:", error);
    return NextResponse.json({ error: "Failed to delete customer" }, { status: 500 });
  }
}
