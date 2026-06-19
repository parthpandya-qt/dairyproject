import { dbConnect } from "@/lib/db";
import User from "@/models/User";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    // 1. Establish database connection
    await dbConnect();

    // 2. Extract data from request body
    const { email, password } = await request.json();

    // Validation check
    if (!email || !password) {
      return NextResponse.json(
        { error: "Please provide both email and password" },
        { status: 400 }
      );
    }

    
    const user = await User.findOne({ email });
    if (!user) {
      return NextResponse.json(
        { error: "Invalid credentials" }, 
        { status: 401 }
      );
    }

    // 4. Verify password legitimacy using bcrypt
    const isPasswordCorrect = await bcrypt.compare(password, user.password!);
    if (!isPasswordCorrect) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    
    const tokenData={
            id:user._id,
            userName:user.userName,
            email:user.email

    }
    const token = jwt.sign(
      tokenData,
      process.env.JWT_SECRET!,
      { expiresIn: "1d" }
    );

   
    const response = NextResponse.json(
      { success: true, message: "Authentication successful" },
      { status: 200 }
    );

    response.cookies.set("token", token, {
      httpOnly: true, // Crucial: Protects cookie from browser/XSS script reads
      secure: process.env.NODE_ENV === "production", // Enforces HTTPS in production
      maxAge: 60 * 60 * 24, // 1 day lifetime matching the JWT expiration
      path: "/", // Token active across every route branch
      sameSite: "strict", // Standard guard against Cross-Site Request Forgery
    });

    return response;

  } catch (error) {
    console.error("Login route error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}