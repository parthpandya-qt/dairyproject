"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import DairyLogo from "@/components/DairyLogo";

interface AdminLayoutClientProps {
  children: React.ReactNode;
  logoutButton: React.ReactNode;
}

export default function AdminLayoutClient({
  children,
  logoutButton,
}: AdminLayoutClientProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  const navLinks = [
    {
      href: "/admin",
      label: "Home",
      icon: (
        <svg className="w-4.5 h-4.5 text-slate-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M9 20H7C5.89543 20 5 19.1046 5 18V10.9199C5 10.336 5.25513 9.78132 5.69842 9.40136L10.6984 5.11564C11.4474 4.47366 12.5526 4.47366 13.3016 5.11564L18.3016 9.40136C18.7449 9.78132 19 10.336 19 10.9199V18C19 19.1046 18.1046 20 17 20H15M9 20V14C9 13.4477 9.44772 13 10 13H14C14.5523 13 15 13.4477 15 14V20M9 20H15" />
        </svg>
      )
    },
    {
      href: "/admin/customers",
      label: "Customers",
      icon: (
        <svg className="w-4.5 h-4.5 text-slate-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      )
    },
    {
      href: "/admin/items",
      label: "Products Catalog",
      icon: (
        <svg className="w-4.5 h-4.5 text-slate-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      )
    },
    {
      href: "/admin/transactions",
      label: "Daily Entries",
      icon: (
        <svg className="w-4.5 h-4.5 text-slate-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
      )
    },
    {
      href: "/admin/ledger",
      label: "Ledger",
      icon: (
        <svg className="w-4.5 h-4.5 text-slate-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      )
    },
    {
      href: "/admin/reports",
      label: "Reports",
      icon: (
        <svg className="w-4.5 h-4.5 text-slate-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      )
    }
  ];

  return (
    <div className="flex min-h-screen bg-slate-50/50">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300"
        />
      )}

      {/* Sidebar Navigation */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-[#0b0f19] text-white flex flex-col shadow-xl border-r border-slate-800/20 shrink-0
          transition-transform duration-300 ease-in-out md:static md:translate-x-0
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="p-6 flex-1 flex flex-col">
          {/* Header & Logo */}
          <div className="flex items-center justify-between mb-10">
            <h2 className="text-xl font-black text-emerald-400 tracking-tight flex items-center gap-2">
              <span className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl">
                <DairyLogo className="w-6 h-6" strokeWidth={2.5} />
              </span>
              Dairy Ledger Admin
            </h2>
            {/* Close button inside sidebar on mobile */}
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-1 hover:bg-slate-800/80 rounded-lg text-slate-400 hover:text-white transition md:hidden cursor-pointer"
              aria-label="Close menu"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Nav Links */}
          <nav className="space-y-1.5 flex-1">
            {navLinks.map((link) => {
              // Exact match for admin home, startsWith for others
              const isActive =
                link.href === "/admin"
                  ? pathname === "/admin" || pathname === "/admin/"
                  : pathname?.startsWith(link.href);

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition duration-150 font-bold text-xs tracking-wide uppercase ${
                    isActive
                      ? "bg-slate-800 text-white border border-slate-700/50"
                      : "text-slate-355 hover:text-white hover:bg-slate-850/80"
                  }`}
                >
                  {link.icon}
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Top Header bar */}
        <header className="bg-white border-b border-slate-200/60 px-4 md:px-8 py-4 shadow-sm flex items-center justify-between sticky top-0 z-30 bg-white/95 backdrop-blur-md">
          <div className="flex items-center gap-3">
            {/* Hamburger button on mobile */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 hover:bg-slate-50 border border-slate-200 rounded-xl md:hidden text-slate-700 transition cursor-pointer"
              aria-label="Open Sidebar"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className="text-base md:text-xl font-black text-slate-800 tracking-tight">
              Dairy Management Center
            </h1>
          </div>
          {logoutButton}
        </header>

        {/* Page Content wrapper */}
        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
          {children}
        </main>

        {/* Bottom Footer */}
        <footer className="bg-white border-t border-slate-200/50 py-4 px-4 md:px-8 text-center text-xs font-semibold text-slate-400">
          © {new Date().getFullYear()} Dairy Management System • Designed to Industry Standards
        </footer>
      </div>
    </div>
  );
}
