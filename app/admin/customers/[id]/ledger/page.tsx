"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { ICustomer, IDairyItem, ITransaction, IExtraItem } from "@/types";

interface PageProps {
  params: Promise<{ id: string }>;
}

interface LedgerEntry {
  id: string;
  date: string;
  type: string;
  itemName: string;
  quantityText: string;
  quantity: number;
  rate: number;
  total: number;
  isDefault: boolean;
  morningQuantity: number;
  eveningQuantity: number;
  itemUnit: string;
  itemId: string | number;
}

export default function CustomerLedgerPage({ params }: PageProps) {
  const { id } = use(params);

  // States
  const [customer, setCustomer] = useState<ICustomer | null>(null);
  const [transactions, setTransactions] = useState<ITransaction[]>([]);
  const [extraItems, setExtraItems] = useState<IExtraItem[]>([]);
  const [items, setItems] = useState<IDairyItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [successMessage, setSuccessMessage] = useState<string>("");

  // Editable row values map keyed by row.id
  const [editedValues, setEditedValues] = useState<Record<string, { morningQty: string; eveningQty: string; extraQty: string; allocatedPrice: string; extraPrice: string }>>({});

  // Filters
  const [dateFilter, setDateFilter] = useState<string>("all"); // all, this_month, last_month, custom
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");

  useEffect(() => {
    loadLedgerData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function loadLedgerData() {
    setLoading(true);
    setError("");
    try {
      const [cRes, tRes, eRes, iRes] = await Promise.all([
        fetch(`/api/customers/${id}`),
        fetch("/api/transactions"),
        fetch("/api/extra-items"),
        fetch("/api/auth/dairy-items")
      ]);

      if (!cRes.ok) throw new Error("Customer profile not found.");
      if (!tRes.ok || !eRes.ok || !iRes.ok) throw new Error("Failed to load delivery logs.");

      const cData = await cRes.json();
      const tData = await tRes.json();
      const eData = await eRes.json();
      const iData = await iRes.json();

      setCustomer(cData);
      setTransactions(tData);
      setExtraItems(eData);
      setItems(iData);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load ledger data.");
    } finally {
      setLoading(false);
    }
  }

  // Handle Date Filter presets
  const getFilterRange = () => {
    const today = new Date();
    let start = "";
    let end = "";

    if (dateFilter === "this_month") {
      const y = today.getFullYear();
      const m = today.getMonth();
      const firstDay = new Date(y, m, 1);
      const lastDay = new Date(y, m + 1, 0);
      
      start = `${y}-${String(m + 1).padStart(2, "0")}-01`;
      end = `${y}-${String(m + 1).padStart(2, "0")}-${String(lastDay.getDate()).padStart(2, "0")}`;
    } else if (dateFilter === "last_month") {
      const y = today.getFullYear();
      const m = today.getMonth() - 1; // Previous month
      const adjustedYear = m < 0 ? y - 1 : y;
      const adjustedMonth = m < 0 ? 11 : m;
      const lastDay = new Date(adjustedYear, adjustedMonth + 1, 0);

      start = `${adjustedYear}-${String(adjustedMonth + 1).padStart(2, "0")}-01`;
      end = `${adjustedYear}-${String(adjustedMonth + 1).padStart(2, "0")}-${String(lastDay.getDate()).padStart(2, "0")}`;
    } else if (dateFilter === "custom") {
      start = startDate;
      end = endDate;
    }

    return { start, end };
  };

  const { start: activeStart, end: activeEnd } = getFilterRange();

  // 1. Filter default transactions & extra items for this customer
  const custTxs = transactions.filter((tx) => tx.customerId === Number(id));
  const custExtras = extraItems.filter((ei) => ei.customerId === Number(id));

  // 2. Map them to a unified format
  const rawLedgerEntries: LedgerEntry[] = [
    ...custTxs.map((tx) => ({
      id: `tx-${tx._id}`,
      date: tx.date,
      type: "Default Allocation",
      itemName: tx.itemName || "Dairy Item",
      quantityText: `${tx.morningQuantity > 0 ? `Morning: ${tx.morningQuantity}` : ""}${
        tx.morningQuantity > 0 && tx.eveningQuantity > 0 ? " | " : ""
      }${tx.eveningQuantity > 0 ? `Evening: ${tx.eveningQuantity}` : ""} ${tx.itemUnit || "L"}`,
      quantity: tx.morningQuantity + tx.eveningQuantity,
      rate: tx.pricePerUnit || tx.itemPrice || 0,
      total: tx.totalPrice,
      isDefault: true,
      morningQuantity: Number(tx.morningQuantity || 0),
      eveningQuantity: Number(tx.eveningQuantity || 0),
      itemUnit: tx.itemUnit || "L",
      itemId: tx.itemId,
    })),
    ...custExtras.map((ei) => ({
      id: `ei-${ei._id}`,
      date: ei.date,
      type: "Extra Item",
      itemName: ei.itemName || "Extra Product",
      quantityText: `${ei.quantity} ${ei.itemUnit || "L"}`,
      quantity: ei.quantity,
      rate: ei.pricePerUnit || ei.itemPrice || 0,
      total: ei.totalPrice,
      isDefault: false,
      morningQuantity: 0,
      eveningQuantity: 0,
      itemUnit: ei.itemUnit || "L",
      itemId: ei.itemId,
    })),
  ];

  // 3. Sort oldest to newest
  rawLedgerEntries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // 4. Initialize edited values mapping when data is loaded
  useEffect(() => {
    const initialValues: typeof editedValues = {};
    rawLedgerEntries.forEach((entry) => {
      initialValues[entry.id] = {
        morningQty: entry.morningQuantity.toString(),
        eveningQty: entry.eveningQuantity.toString(),
        extraQty: (!entry.isDefault ? entry.quantity : 0).toString(),
        allocatedPrice: (entry.isDefault ? entry.total : 0).toString(),
        extraPrice: (!entry.isDefault ? entry.total : 0).toString(),
      };
    });
    setEditedValues(initialValues);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactions, extraItems]);

  // 5. Filter entries based on search query and date filters
  const filteredEntries: LedgerEntry[] = [];

  rawLedgerEntries.forEach((entry) => {
    const matchesSearch = searchQuery 
      ? entry.itemName.toLowerCase().includes(searchQuery.toLowerCase()) || 
        entry.type.toLowerCase().includes(searchQuery.toLowerCase())
      : true;

    const dateVal = entry.date;
    const isBeforeStart = activeStart && dateVal < activeStart;
    const isAfterEnd = activeEnd && dateVal > activeEnd;

    if (!isBeforeStart && !isAfterEnd && matchesSearch) {
      filteredEntries.push(entry);
    }
  });

  async function handleSaveAllLedgerChanges() {
    setLoading(true);
    setError("");
    setSuccessMessage("");
    try {
      const promises: Promise<Response>[] = [];

      filteredEntries.forEach((entry) => {
        const edits = editedValues[entry.id];
        if (!edits) return;

        if (entry.isDefault) {
          const morningQty = Number(edits.morningQty || 0);
          const eveningQty = Number(edits.eveningQty || 0);
          const totalPrice = Number(edits.allocatedPrice || 0);
          const realId = entry.id.replace("tx-", "");

          promises.push(
            fetch(`/api/transactions/${realId}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                customerId: Number(id),
                itemId: entry.itemId,
                date: entry.date,
                morningQuantity: morningQty,
                eveningQuantity: eveningQty,
                totalPrice: totalPrice,
                pricePerUnit: entry.rate
              })
            })
          );
        } else {
          const quantity = Number(edits.extraQty || 0);
          const totalPrice = Number(edits.extraPrice || 0);
          const realId = entry.id.replace("ei-", "");

          if (quantity === 0) {
            promises.push(
              fetch(`/api/extra-items/${realId}`, {
                method: "DELETE"
              })
            );
          } else {
            promises.push(
              fetch(`/api/extra-items/${realId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  customerId: Number(id),
                  itemId: entry.itemId,
                  date: entry.date,
                  quantity: quantity,
                  totalPrice: totalPrice,
                  pricePerUnit: entry.rate
                })
              })
            );
          }
        }
      });

      const responses = await Promise.all(promises);
      const allOk = responses.every((r) => r.ok);

      if (allOk) {
        setSuccessMessage("Ledger updates saved to database successfully!");
        loadLedgerData();
      } else {
        setError("Failed to update some ledger entries. Please check the inputs.");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to save ledger updates.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 text-black pb-12">
      {/* Back button */}
      <div className="flex items-center justify-between border-b border-slate-200/60 pb-5">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/customers"
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-655 rounded-xl transition duration-150"
            title="Back to Customers"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              Customer Ledger
            </h1>
            <p className="text-xs text-slate-400 font-semibold">
              Detailed transaction statement and outstanding balances.
            </p>
          </div>
        </div>
      </div>

      {/* Global Toast Alerts Feedback */}
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-150 text-emerald-800 rounded-2xl text-xs font-bold transition-all shadow-sm flex items-center gap-2 animate-in fade-in duration-200">
          <span className="p-1 bg-emerald-100 text-emerald-700 rounded-lg">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
            </svg>
          </span>
          {successMessage}
        </div>
      )}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-150 text-rose-800 rounded-2xl text-xs font-bold transition-all shadow-sm flex items-center gap-2 animate-in fade-in duration-200">
          <span className="p-1 bg-rose-100 text-rose-700 rounded-lg">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </span>
          {error}
        </div>
      )}

      {loading ? (
        <div className="p-20 text-center text-slate-455 text-xs font-semibold flex flex-col items-center justify-center gap-2">
          <svg className="w-7 h-7 animate-spin text-slate-350" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
          </svg>
          Loading statement logs...
        </div>
      ) : error ? (
        <div className="p-6 bg-rose-50 border border-rose-150 text-rose-800 rounded-2xl text-xs font-bold text-center">
          {error}
        </div>
      ) : customer ? (
        <>
          {/* Customer info card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row justify-between gap-6 print:border-none print:shadow-none print:p-0">
            <div className="space-y-2.5">
              <div>
                <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-lg text-[9px] font-black uppercase tracking-wider">
                  Client Profile
                </span>
                <h2 className="text-xl font-black text-slate-900 mt-1">{customer.name}</h2>
              </div>
              <div className="grid grid-cols-1 gap-y-1 text-xs text-slate-656 font-medium">
                <p className="flex items-center gap-1.5">
                  <span className="text-slate-400">Phone:</span>
                  <span className="font-bold text-slate-800">{customer.phone}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Filtering bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => setDateFilter("all")}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition ${
                  dateFilter === "all"
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-white hover:bg-slate-50 text-slate-655 border-slate-200"
                }`}
              >
                All Time
              </button>
              <button
                onClick={() => setDateFilter("this_month")}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition ${
                  dateFilter === "this_month"
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-white hover:bg-slate-50 text-slate-655 border-slate-200"
                }`}
              >
                This Month
              </button>
              <button
                onClick={() => setDateFilter("last_month")}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition ${
                  dateFilter === "last_month"
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-white hover:bg-slate-50 text-slate-655 border-slate-200"
                }`}
              >
                Last Month
              </button>
              <button
                onClick={() => setDateFilter("custom")}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition ${
                  dateFilter === "custom"
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-white hover:bg-slate-50 text-slate-655 border-slate-200"
                }`}
              >
                Custom Range
              </button>
            </div>

            {/* Custom Dates Inputs */}
            {dateFilter === "custom" && (
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-2.5 py-1.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
                <span className="text-slate-400 text-xs">to</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-2.5 py-1.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>
            )}

            {/* Search Input */}
            <div className="relative md:w-64">
              <input
                type="text"
                placeholder="Search items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
            </div>
          </div>

          {/* Ledger Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden print:border-none print:shadow-none">
            <div className="p-5 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center print:px-0 print:bg-transparent">
              <h3 className="font-extrabold text-slate-800 text-sm tracking-tight">
                Statement of Accounts
                <span className="px-2.5 py-0.5 bg-slate-200 text-slate-655 rounded-full text-[10px] font-bold ml-2 print:hidden">
                  {filteredEntries.length} Records
                </span>
              </h3>
              <div className="flex items-center gap-3">
                {dateFilter !== "all" && (
                  <div className="text-[11px] text-slate-500 font-bold">
                    Period: <span className="text-slate-800">{activeStart || "Start"}</span> to <span className="text-slate-800">{activeEnd || "End"}</span>
                  </div>
                )}
                <button
                  onClick={handleSaveAllLedgerChanges}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-bold text-xs rounded-xl shadow transition duration-150 cursor-pointer flex items-center gap-1.5"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                  </svg>
                  Add to Data Base
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/30 print:bg-transparent">
                    <th className="table-header-cell border-b border-slate-100 py-3.5 px-5 print:px-2">
                      <div className="flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Date
                      </div>
                    </th>
                    <th className="table-header-cell border-b border-slate-100 py-3.5 px-5 print:px-2">
                      <div className="flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                        Allocated Product
                      </div>
                    </th>
                    <th className="table-header-cell border-b border-slate-100 py-3.5 px-5 print:px-2">
                      <div className="flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
                        </svg>
                        Morning Qty
                      </div>
                    </th>
                    <th className="table-header-cell border-b border-slate-100 py-3.5 px-5 print:px-2">
                      <div className="flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" />
                        </svg>
                        Evening Qty
                      </div>
                    </th>
                    <th className="table-header-cell border-b border-slate-100 py-3.5 px-5 print:px-2">
                      <div className="flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M12 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                        </svg>
                        Extra Product Added
                      </div>
                    </th>
                    <th className="table-header-cell border-b border-slate-100 py-3.5 px-5 print:px-2 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Allocated Price
                      </div>
                    </th>
                    <th className="table-header-cell border-b border-slate-100 py-3.5 px-5 print:px-2 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <svg className="w-3.5 h-3.5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Extra Price
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredEntries.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-10 text-center text-slate-400 text-xs font-semibold">
                        No transactions logged for the selected filters.
                      </td>
                    </tr>
                  ) : (
                    filteredEntries.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50/20 transition duration-100">
                        {/* Date */}
                        <td className="table-body-cell py-3.5 px-5 print:px-2 text-xs font-bold text-slate-700 whitespace-nowrap">
                          {row.date}
                        </td>
                        
                        {/* Allocated Product */}
                        <td className="table-body-cell py-3.5 px-5 print:px-2 text-xs font-bold text-slate-850">
                          {row.isDefault ? row.itemName : "-"}
                        </td>
                        
                        {/* Morning Quantity (Editable) */}
                        <td className="table-body-cell py-3.5 px-5 print:px-2 text-xs text-slate-600 font-semibold">
                          {row.isDefault ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={editedValues[row.id]?.morningQty || "0"}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  const rate = row.rate;
                                  const morn = Number(val || 0);
                                  const eve = Number(editedValues[row.id]?.eveningQty || 0);
                                  const newTotal = (morn + eve) * rate;
                                  setEditedValues({
                                    ...editedValues,
                                    [row.id]: {
                                      ...editedValues[row.id],
                                      morningQty: val,
                                      allocatedPrice: newTotal.toFixed(2),
                                    }
                                  });
                                }}
                                className="w-16 border border-slate-205 rounded-lg px-2 py-1 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                              />
                              <span className="text-[10px] text-slate-400 font-semibold">{row.itemUnit}</span>
                            </div>
                          ) : (
                            "-"
                          )}
                        </td>
                        
                        {/* Evening Quantity (Editable) */}
                        <td className="table-body-cell py-3.5 px-5 print:px-2 text-xs text-slate-600 font-semibold">
                          {row.isDefault ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={editedValues[row.id]?.eveningQty || "0"}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  const rate = row.rate;
                                  const morn = Number(editedValues[row.id]?.morningQty || 0);
                                  const eve = Number(val || 0);
                                  const newTotal = (morn + eve) * rate;
                                  setEditedValues({
                                    ...editedValues,
                                    [row.id]: {
                                      ...editedValues[row.id],
                                      eveningQty: val,
                                      allocatedPrice: newTotal.toFixed(2),
                                    }
                                  });
                                }}
                                className="w-16 border border-slate-205 rounded-lg px-2 py-1 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                              />
                              <span className="text-[10px] text-slate-400 font-semibold">{row.itemUnit}</span>
                            </div>
                          ) : (
                            "-"
                          )}
                        </td>
                        
                        {/* Extra Product Details & Qty (Editable) */}
                        <td className="table-body-cell py-3.5 px-5 print:px-2 text-xs font-bold text-slate-700">
                          {!row.isDefault ? (
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs text-slate-700 font-bold max-w-[100px] truncate" title={row.itemName}>
                                {row.itemName}
                              </span>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={editedValues[row.id]?.extraQty || "0"}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  const rate = row.rate;
                                  const qty = Number(val || 0);
                                  const newTotal = qty * rate;
                                  setEditedValues({
                                    ...editedValues,
                                    [row.id]: {
                                      ...editedValues[row.id],
                                      extraQty: val,
                                      extraPrice: newTotal.toFixed(2),
                                    }
                                  });
                                }}
                                className="w-14 border border-slate-205 rounded-lg px-2 py-1 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                              />
                              <span className="text-[10px] text-slate-400 font-semibold">{row.itemUnit}</span>
                            </div>
                          ) : (
                            "-"
                          )}
                        </td>
                        
                        {/* Allocated Price (Editable) */}
                        <td className="table-body-cell py-3.5 px-5 print:px-2 text-xs font-black text-slate-850 text-right font-bold">
                          {row.isDefault ? (
                            <div className="flex justify-end items-center gap-1">
                              <span className="text-slate-400 text-xs">₹</span>
                              <input
                                type="number"
                                step="0.01"
                                value={editedValues[row.id]?.allocatedPrice || "0.00"}
                                onChange={(e) => setEditedValues({
                                  ...editedValues,
                                  [row.id]: {
                                    ...editedValues[row.id],
                                    allocatedPrice: e.target.value
                                  }
                                })}
                                className="w-20 border border-slate-205 rounded-lg px-2 py-1 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white text-right"
                              />
                            </div>
                          ) : (
                            "-"
                          )}
                        </td>
                        
                        {/* Extra Price (Editable) */}
                        <td className="table-body-cell py-3.5 px-5 print:px-2 text-xs font-black text-slate-850 text-right font-bold">
                          {!row.isDefault ? (
                            <div className="flex justify-end items-center gap-1">
                              <span className="text-slate-400 text-xs">₹</span>
                              <input
                                type="number"
                                step="0.01"
                                value={editedValues[row.id]?.extraPrice || "0.00"}
                                onChange={(e) => setEditedValues({
                                  ...editedValues,
                                  [row.id]: {
                                    ...editedValues[row.id],
                                    extraPrice: e.target.value
                                  }
                                })}
                                className="w-20 border border-slate-205 rounded-lg px-2 py-1 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white text-right"
                              />
                            </div>
                          ) : (
                            "-"
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Bottom Actions Toolbar */}
            <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex justify-end">
              <button
                onClick={handleSaveAllLedgerChanges}
                className="px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold text-sm rounded-xl shadow-md hover:shadow active:scale-[0.98] cursor-pointer flex items-center gap-1.5 transition duration-150"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                </svg>
                Add to Data Base
              </button>
            </div>
          </div>
        </>
      ) : (
        <div className="p-16 text-center text-slate-455 text-xs font-semibold">
          Customer profile data is unavailable.
        </div>
      )}
    </div>
  );
}
