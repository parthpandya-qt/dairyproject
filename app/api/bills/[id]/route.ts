import { dbConnect } from "@/lib/db";
import { Bill } from "@/models/Bill";
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
      return NextResponse.json({ error: "Bill ID is required" }, { status: 400 });
    }

    const { paidAmount, status } = await request.json();

    if (paidAmount === undefined || !status) {
      return NextResponse.json(
        { error: "Paid amount and status are required" },
        { status: 400 }
      );
    }

    const updated = await Bill.findByIdAndUpdate(id, {
      paidAmount: Number(paidAmount),
      status
    }, userId);

    if (!updated) {
      return NextResponse.json({ error: "Bill not found or unauthorized" }, { status: 404 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("PUT Bill Error:", error);
    return NextResponse.json({ error: "Failed to update bill" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const userId = await getCurrentUserId();
    await dbConnect();
    
    const resolvedParams = await params;
    const { id } = resolvedParams;

    if (!id) {
      return NextResponse.json({ error: "Bill ID is required" }, { status: 400 });
    }

    const deleted = await Bill.delete(id, userId);

    if (!deleted) {
      return NextResponse.json({ error: "Bill not found or unauthorized" }, { status: 404 });
    }

    return NextResponse.json(
      { success: true, message: "Bill successfully removed" },
      { status: 200 }
    );
  } catch (error) {
    console.error("DELETE Bill Error:", error);
    return NextResponse.json({ error: "Failed to delete bill" }, { status: 500 });
  }
}
