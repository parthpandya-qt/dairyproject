import Link from "next/link";
import { getCurrentUserId } from "@/lib/auth";
import { query } from "@/lib/db";
import DairyLogo from "@/components/DairyLogo";

export default async function AdminDashboardHome() {
  const userId = await getCurrentUserId();

  // 1. Fetch total customers served (including soft deleted ones to reflect total served since setup)
  const customerRow = await query("SELECT COUNT(*) as count FROM customers WHERE userId = ?", [userId]);
  const totalCustomers = Number(customerRow[0]?.count || 0);

  // 2. Fetch total items/products in inventory along with their names
  const defaultItems = await query("SELECT name FROM default_dairy_items WHERE deletedAt IS NULL ORDER BY name ASC");
  const adminItems = await query("SELECT name FROM dairy_items WHERE deletedAt IS NULL AND userId = ? ORDER BY name ASC", [userId]);
  const items = [...(defaultItems || []), ...(adminItems || [])];
  const totalItems = items.length;
  const itemNamesList = items.map((i: any) => i.name).join(", ");

  // 3. Fetch total revenue generated till now across all transactions and extra items
  const txRevenueRow = await query("SELECT SUM(totalPrice) as totalRevenue FROM transactions WHERE userId = ?", [userId]);
  const extraRevenueRow = await query("SELECT SUM(totalPrice) as totalRevenue FROM extra_item WHERE userId = ?", [userId]);
  const totalRevenue = Number(txRevenueRow[0]?.totalRevenue || 0) + Number(extraRevenueRow[0]?.totalRevenue || 0);

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      {/* Welcome banner */}
      <div className="bg-gradient-to-br from-[#0a0f1d] via-[#0d1527] to-[#050811] text-white p-8 sm:p-10 rounded-3xl border border-slate-800/30 shadow-[0_20px_50px_rgba(0,0,0,0.15)] relative overflow-hidden select-none">
        <div className="absolute -right-4 -bottom-4 opacity-15 pointer-events-none translate-x-8 translate-y-8 hidden sm:block">
          <DairyLogo className="w-80 h-80 text-emerald-400" strokeWidth={0.5} />
        </div>
        <div className="relative z-10 max-w-xl space-y-4">
          <span className="px-3.5 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full text-[10px] font-black uppercase tracking-wider">
            Control Console
          </span>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight leading-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
            Dairy Management Center
          </h2>
          <p className="text-slate-400 text-xs sm:text-sm font-medium leading-relaxed">
            Monitor distributions, manage registered clients, track product rate indices, and update ledger transaction logs.
          </p>
        </div>
      </div>

      {/* Modern Metric Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200/70 shadow-[0_4px_20px_rgba(0,0,0,0.015)] space-y-4 hover:shadow-[0_8px_30px_rgba(59,130,246,0.05)] hover:border-blue-500/15 transition-all duration-300 group">
          <div className="flex justify-between items-start">
            <div className="p-3 rounded-xl bg-blue-50 text-blue-600 transition duration-300 group-hover:scale-105">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <span className="text-[10px] font-extrabold text-blue-600 bg-blue-55/10 px-2.5 py-1 rounded-md uppercase tracking-wider">
              Active Clients
            </span>
          </div>
          <div>
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Customers</h4>
            <div className="text-3xl font-black text-slate-800 tracking-tight mt-1">
              {totalCustomers}
            </div>
            <p className="text-[11px] text-slate-450 font-semibold mt-2.5 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              All registered user profiles
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200/70 shadow-[0_4px_20px_rgba(0,0,0,0.015)] space-y-4 hover:shadow-[0_8px_30px_rgba(245,158,11,0.05)] hover:border-amber-500/15 transition-all duration-300 group">
          <div className="flex justify-between items-start">
            <div className="p-3 rounded-xl bg-amber-50 text-amber-600 transition duration-300 group-hover:scale-105">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <span className="text-[10px] font-extrabold text-amber-600 bg-amber-50/20 px-2.5 py-1 rounded-md uppercase tracking-wider">
              Inventory
            </span>
          </div>
          <div>
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Configured Products</h4>
            <div className="text-3xl font-black text-slate-800 tracking-tight mt-1">
              {totalItems}
            </div>
            <p className="text-[11px] text-slate-450 font-semibold mt-2.5 truncate" title={itemNamesList || "No products configured"}>
              {totalItems > 0 ? `Types: ${itemNamesList}` : "No products in database"}
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200/70 shadow-[0_4px_20px_rgba(0,0,0,0.015)] space-y-4 hover:shadow-[0_8px_30px_rgba(16,185,129,0.05)] hover:border-emerald-500/15 transition-all duration-300 group">
          <div className="flex justify-between items-start">
            <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600 transition duration-300 group-hover:scale-105">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
            </div>
            <span className="text-[10px] font-extrabold text-emerald-600 bg-emerald-55/10 px-2.5 py-1 rounded-md uppercase tracking-wider">
              Earnings
            </span>
          </div>
          <div>
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Revenue Generated</h4>
            <div className="text-3xl font-black text-slate-800 tracking-tight mt-1">
              ₹{totalRevenue.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-slate-450 font-semibold mt-2.5 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              Across all deliveries & extras
            </p>
          </div>
        </div>
      </div>

      {/* Directory Shortcut Cards Grid */}
      <div className="space-y-4">
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-450 mt-10">Quick Actions & Shortcuts</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link href="/admin/customers" className="group bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm transition hover:shadow-md hover:border-blue-500/20 duration-200 block space-y-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-blue-50 text-blue-600 transition group-hover:scale-105 duration-150">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <div>
              <h3 className="font-extrabold text-slate-800 group-hover:text-blue-650 transition tracking-tight">Customers Directory</h3>
              <p className="text-[11px] text-slate-450 font-medium mt-1 leading-relaxed">
                Register clients, manage addresses, and configure standard allocations.
              </p>
            </div>
            <div className="text-[11px] font-extrabold text-blue-600 uppercase tracking-wider flex items-center gap-1 group-hover:translate-x-1 transition duration-150 pt-2">
              Open Directory
              <span>→</span>
            </div>
          </Link>

          <Link href="/admin/items" className="group bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm transition hover:shadow-md hover:border-amber-500/20 duration-200 block space-y-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-amber-50 text-amber-600 transition group-hover:scale-105 duration-150">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <div>
              <h3 className="font-extrabold text-slate-800 group-hover:text-amber-650 transition tracking-tight">Products Catalog</h3>
              <p className="text-[11px] text-slate-450 font-medium mt-1 leading-relaxed">
                Add dairy inventory products, Cow/Buffalo milk types, and custom prices.
              </p>
            </div>
            <div className="text-[11px] font-extrabold text-amber-600 uppercase tracking-wider flex items-center gap-1 group-hover:translate-x-1 transition duration-150 pt-2">
              Open Catalog
              <span>→</span>
            </div>
          </Link>

          <Link href="/admin/transactions" className="group bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm transition hover:shadow-md hover:border-emerald-500/20 duration-200 block space-y-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-emerald-50 text-emerald-600 transition group-hover:scale-105 duration-150">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
            </div>
            <div>
              <h3 className="font-extrabold text-slate-800 group-hover:text-emerald-650 transition tracking-tight">Daily Log Sheets</h3>
              <p className="text-[11px] text-slate-450 font-medium mt-1 leading-relaxed">
                Log daily distributions, select dates, view totals, and modify logs.
              </p>
            </div>
            <div className="text-[11px] font-extrabold text-emerald-600 uppercase tracking-wider flex items-center gap-1 group-hover:translate-x-1 transition duration-150 pt-2">
              Open Sheets
              <span>→</span>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}