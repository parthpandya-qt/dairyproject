import { redirect } from "next/navigation";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import AdminLayoutClient from "@/components/AdminLayoutClient";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default async function AdminLayout({
  children,
}: AdminLayoutProps) {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  if (!token) {
    redirect("/signin");
  }

  try {
    jwt.verify(token, process.env.JWT_SECRET!);
  } catch {
    redirect("/signin");
  }

  const logoutButton = (
    <form action="/api/auth/logout" method="POST">
      <button
        type="submit"
        className="bg-red-600 hover:bg-red-750 text-white font-extrabold text-xs px-3 py-2 md:px-4 md:py-2.5 rounded-xl shadow-sm hover:shadow transition duration-200 cursor-pointer tracking-wider uppercase flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.98]"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
        <span className="hidden sm:inline">Sign Out</span>
      </button>
    </form>
  );

  return (
    <AdminLayoutClient logoutButton={logoutButton}>
      {children}
    </AdminLayoutClient>
  );
}