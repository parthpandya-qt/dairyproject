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
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Welcome banner */}
      <div className="bg-gradient-to-r from-[#0b0f19] to-slate-900 text-white p-6 sm:p-8 rounded-3xl border border-slate-800/20 shadow-lg relative overflow-hidden">
        <div className="absolute right-0 bottom-0 opacity-15 pointer-events-none translate-x-12 translate-y-12 hidden sm:block">
          <DairyLogo className="w-80 h-80" strokeWidth={0.75} />
        </div>
        <div className="relative z-10 max-w-xl space-y-3">
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">
            Welcome to the Dairy Management Center
          </h2>
          <p className="text-slate-350 text-xs sm:text-sm font-medium leading-relaxed">
            Monitor distributions, manage registered clients, track product rate indices, and update ledger transaction logs.
          </p>
        </div>
      </div>

      {/* Directory Shortcut Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link href="/admin/customers" className="group bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm transition hover:shadow-md hover:border-slate-300 duration-200 block space-y-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-blue-50 text-blue-600 transition group-hover:scale-105 duration-150">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <div>
            <h3 className="font-extrabold text-slate-800 group-hover:text-blue-650 transition tracking-tight">Customers Directory</h3>
            <p className="text-xs text-slate-500 font-bold mt-1.5 leading-relaxed">
              Customers Served: <span className="text-[11px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md ml-1">{totalCustomers} served</span>
            </p>
            <p className="text-[11px] text-slate-400 font-medium mt-1 leading-relaxed">
              Register clients, manage addresses, and configure standard allocations.
            </p>
          </div>
          <div className="text-[11px] font-extrabold text-blue-600 uppercase tracking-wider flex items-center gap-1 group-hover:translate-x-1 transition duration-150 pt-2">
            Open Directory
            <span>→</span>
          </div>
        </Link>

        <Link href="/admin/items" className="group bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm transition hover:shadow-md hover:border-slate-300 duration-200 block space-y-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-amber-50 text-amber-600 transition group-hover:scale-105 duration-150">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <div>
            <h3 className="font-extrabold text-slate-800 group-hover:text-amber-650 transition tracking-tight">Products Catalog</h3>
            <p className="text-xs text-slate-500 font-bold mt-1.5 leading-relaxed">
              Available Items: <span className="text-[11px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md ml-1">{totalItems} active</span>
            </p>
            <p className="text-[11px] text-slate-400 font-medium mt-1 leading-relaxed truncate" title={itemNamesList || "No items configured"}>
              {totalItems > 0 ? `Products: ${itemNamesList}` : "No products added to catalog yet."}
            </p>
          </div>
          <div className="text-[11px] font-extrabold text-amber-600 uppercase tracking-wider flex items-center gap-1 group-hover:translate-x-1 transition duration-150 pt-2">
            Open Catalog
            <span>→</span>
          </div>
        </Link>

        <Link href="/admin/transactions" className="group bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm transition hover:shadow-md hover:border-slate-300 duration-200 block space-y-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-emerald-50 text-emerald-600 transition group-hover:scale-105 duration-150">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
          </div>
          <div>
            <h3 className="font-extrabold text-slate-800 group-hover:text-emerald-650 transition tracking-tight">Log sheets</h3>
            <p className="text-xs text-slate-500 font-bold mt-1.5 leading-relaxed">
              Revenue Generated: <span className="text-[11px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md ml-1">₹{totalRevenue.toFixed(2)}</span>
            </p>
            <p className="text-[11px] text-slate-400 font-medium mt-1 leading-relaxed">
              Log daily distributions, select dates, view totals, and modify transaction history lists.
            </p>
          </div>
          <div className="text-[11px] font-extrabold text-emerald-600 uppercase tracking-wider flex items-center gap-1 group-hover:translate-x-1 transition duration-150 pt-2">
            Open Sheets
            <span>→</span>
          </div>
        </Link>
      </div>
    </div>
  );
}