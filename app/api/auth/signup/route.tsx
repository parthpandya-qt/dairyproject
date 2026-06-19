import { dbConnect } from "@/lib/db";
import User from "@/models/User";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    
    await dbConnect();

  
    const { username, email, password } = await request.json();

    
    if (!username || !email || !password) {
      return NextResponse.json(
        { error: "Username, email, and password are all required" },
        { status: 400 }
      );
    }

  
    const existingUser = await User.findOne({
      $or: [
        { username: username.trim() },
        { email: email.toLowerCase().trim() }
      ]
    });

    if (existingUser) {
  
      if (existingUser.userName === username.trim()) {
        return NextResponse.json({ error: "Username is already taken" }, { status: 400 });
      }
      if (existingUser.email === email.toLowerCase().trim()) {
        return NextResponse.json({ error: "Email is already registered" }, { status: 400 });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 12);


    const newAdmin = await User.create({
      userName: username.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
    });

    
    return NextResponse.json(
      { 
        success: true, 
        message: "Admin registered successfully",
        user: { id: newAdmin._id, username: newAdmin.userName, email: newAdmin.email }
      },
      { status: 201 }
    );

  } catch (error) {
    console.error("Signup API Route Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error during registration" },
      { status: 500 }
    );
  }
}