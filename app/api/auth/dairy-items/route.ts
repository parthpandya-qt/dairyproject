import { dbConnect } from "@/lib/db";
import DairyItem from "@/models/DairyItem";
import { getCurrentUserId } from "@/lib/auth";
import { NextResponse } from "next/server";

// 1. GET: Fetch all current items for logged-in user
export async function GET() {
  try {
    const userId = await getCurrentUserId();
    await dbConnect();
    const items = await DairyItem.find(userId);
    return NextResponse.json(items, { status: 200 });
  } catch (error) {
    console.error("GET Dairy Items Error:", error);
    return NextResponse.json({ error: "Failed to fetch dairy items" }, { status: 500 });
  }
}

// 2. POST: Add a completely new core item asset
export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId();
    await dbConnect();
    const { name, pricePerUnit, unit } = await request.json();

    // Data validations
    if (!name || !pricePerUnit || !unit) {
      return NextResponse.json({ error: "Missing required item attributes" }, { status: 400 });
    }

    const itemExists = await DairyItem.findOne({ name: name.trim() }, userId);
    if (itemExists) {
      return NextResponse.json({ error: "An item with this name already exists" }, { status: 400 });
    }

    const newItem = await DairyItem.create({
      name: name.trim(),
      pricePerUnit: Number(pricePerUnit),
      unit, 
    }, userId);

    return NextResponse.json({ success: true, data: newItem }, { status: 201 });
  } catch (error) {
    console.error("Dairy Items POST Error:", error);
    return NextResponse.json({ error: "Failed to add dairy item" }, { status: 500 });
  }
}