import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

export async function getCurrentUserId(): Promise<number> {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) {
    throw new Error("Unauthorized: No session token found");
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string };
    return parseInt(decoded.id, 10);
  } catch (error) {
    console.error("Token verification failed:", error);
    throw new Error("Unauthorized: Invalid session token");
  }
}
