import { redirect } from "next/navigation";
import jwt from "jsonwebtoken";
import Link from "next/link";
import { cookies } from "next/headers";
import DairyLogo from "@/components/DairyLogo";

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

  return (
    <div className="flex min-h-screen bg-slate-50/50">
      {/* Sidebar Navigation */}
      <aside className="w-72 bg-[#0b0f19] text-white flex flex-col shadow-xl border-r border-slate-800/20 shrink-0">
        <div className="p-6 sticky top-0 z-50 backdrop-blur-md">
          <h2 className="text-xl font-black text-emerald-450 tracking-tight flex items-center gap-2 mb-10">
            <span className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl">
              <DairyLogo className="w-6 h-6" strokeWidth={2.5} />
            </span>
            Dairy Ledger Admin
          </h2>

          <nav className="space-y-1.5 ">
            <Link
              href="/admin/customers"
              className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-850/80 transition duration-150 font-bold text-xs text-slate-355 hover:text-white tracking-wide uppercase"
            >
              <svg className="w-4.5 h-4.5 text-slate-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              Customers
            </Link>

            <Link
              href="/admin/items"
              className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-850/80 transition duration-150 font-bold text-xs text-slate-355 hover:text-white tracking-wide uppercase"
            >
              <svg className="w-4.5 h-4.5 text-slate-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              Products Catalog
            </Link>

            <Link
              href="/admin/transactions"
              className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-850/80 transition duration-150 font-bold text-xs text-slate-355 hover:text-white tracking-wide uppercase"
            >
              <svg className="w-4.5 h-4.5 text-slate-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
              Daily Sheets
            </Link>
          </nav>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Top Header bar with title on left, Sign Out on right */}
        <header className="bg-white border-b border-slate-200/60 px-8 py-4 shadow-sm flex items-center justify-between sticky top-0 z-50 bg-white/95 backdrop-blur-md">
          <h1 className="text-xl font-black text-slate-800 tracking-tight">
            Dairy Management Center
          </h1>
          <form action="/api/auth/logout" method="POST">
            <button
              type="submit"
              className="bg-red-600 hover:bg-red-750 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl shadow-sm hover:shadow transition duration-200 cursor-pointer tracking-wider uppercase flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.98]"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Sign Out
            </button>
          </form>
        </header>

        {/* Page Content wrapper */}
        <main className="flex-1 p-8 overflow-y-auto">
          {children}
        </main>

        {/* Bottom Footer */}
        <footer className="bg-white border-t border-slate-200/50 py-4 px-8 text-center text-xs font-semibold text-slate-400">
          © {new Date().getFullYear()} Dairy Management System • Designed to Industry Standards
        </footer>
      </div>
    </div>
  );
}