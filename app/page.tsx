"use client";
import Link from "next/link";
import DairyLogo from "@/components/DairyLogo";

export default function GlobalRootPage() {
  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col justify-between text-black">
      
      {/* Top Navigation Bar */}
      <header className="bg-white border-b border-slate-200/50 px-4 sm:px-6 py-4 shadow-sm sticky top-0 z-50 bg-white/95 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-2.5">
            <span className="p-1.5 bg-emerald-500/10 text-emerald-600 rounded-lg inline-flex">
              <DairyLogo className="w-5 h-5" strokeWidth={2.5} />
            </span>
            <span className="text-lg sm:text-xl font-black tracking-tight text-slate-800">
              DairyFlow Pro
            </span>
          </div>
          <div className="flex items-center gap-2.5 sm:gap-4">
            <Link 
              href="/signin" 
              className="text-xs font-bold text-slate-600 hover:text-slate-900 transition tracking-wide uppercase px-1 py-2"
            >
              Sign In
            </Link>
            <Link 
              href="/signup" 
              className="text-[10px] sm:text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl transition shadow-sm tracking-wide uppercase hover:scale-[1.01] active:scale-[0.98]"
            >
              Register Admin
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 my-6 sm:my-12">
        <div className="max-w-3xl text-center space-y-6 sm:space-y-8">
          <div className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 px-3.5 py-1 rounded-full text-emerald-700 text-[10px] sm:text-xs font-bold uppercase tracking-wider">
            <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            Enterprise Dairy Management System
          </div>
          
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-slate-900 tracking-tight leading-tight">
            Streamline Your Daily <br className="hidden sm:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-green-600">
              Dairy & Milk Ledger
            </span>
          </h1>
          
          <p className="text-xs sm:text-sm md:text-base text-slate-500 max-w-xl mx-auto leading-relaxed font-medium px-2">
            Efficiently log daily milk distributions in liters, manage customer directories, track catalog pricing, and review transactions from a unified, security-first administrator portal.
          </p>

          <div className="flex flex-col sm:flex-row justify-center items-center gap-3 pt-2 sm:pt-4 px-4 sm:px-0">
            <Link 
              href="/signin" 
              className="w-full sm:w-auto bg-[#0b0f19] hover:bg-slate-900 text-white font-extrabold text-xs tracking-wider uppercase px-8 py-4 rounded-xl shadow-md transition duration-200 hover:scale-[1.01] active:scale-[0.98] text-center"
            >
              Go to Admin Dashboard
            </Link>
            <Link 
              href="/signup" 
              className="w-full sm:w-auto bg-white hover:bg-slate-50 border border-slate-250/80 font-bold text-xs tracking-wider uppercase px-8 py-4 rounded-xl text-slate-700 transition duration-200 shadow-sm text-center"
            >
              Create New Account
            </Link>
          </div>
        </div>
      </main>

      {/* Feature Cards Grid */}
      <section className="bg-white border-t border-slate-200/60 py-12 sm:py-16 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          <div className="p-6 bg-slate-50/60 rounded-2xl border border-slate-200/60 shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <h3 className="font-extrabold text-slate-800 tracking-tight">Customer Directories</h3>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              Maintain records of regular clients, default delivery allocations, address indices, and contact configurations.
            </p>
          </div>

          <div className="p-6 bg-slate-50/60 rounded-2xl border border-slate-200/60 shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
              </svg>
            </div>
            <h3 className="font-extrabold text-slate-800 tracking-tight">Daily Entry Sheets</h3>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              Instantly input exact liters for clients every day with dynamic price calculations and total morning/evening volumes.
            </p>
          </div>

          <div className="p-6 bg-slate-50/60 rounded-2xl border border-slate-200/60 shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-650 flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <h3 className="font-extrabold text-slate-800 tracking-tight">Products Inventory</h3>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              Manage product entries, buffalo/cow milk rates per unit, metric designations, and soft delete configurations.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#0b0f19] text-slate-500 text-center py-6 border-t border-slate-900 text-xs font-semibold">
        &copy; {new Date().getFullYear()} DairyFlow Pro Systems. All Rights Reserved.
      </footer>

    </div>
  );
}