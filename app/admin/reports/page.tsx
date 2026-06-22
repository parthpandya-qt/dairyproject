"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ITransaction, IExtraItem, ICustomer, IBill } from "@/types";

interface MonthCol {
  key: string; // YYYY-MM
  name: string; // e.g. "Jun 2026"
}

export default function ReportsPage() {
  const [transactions, setTransactions] = useState<ITransaction[]>([]);
  const [extraItems, setExtraItems] = useState<IExtraItem[]>([]);
  const [customers, setCustomers] = useState<ICustomer[]>([]);
  const [bills, setBills] = useState<IBill[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [savingBill, setSavingBill] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [successMessage, setSuccessMessage] = useState<string>("");
  const [selectedCustomerForReceipt, setSelectedCustomerForReceipt] = useState<ICustomer | null>(null);
  const [activeCustomer, setActiveCustomer] = useState<ICustomer | null>(null);
  const [selectedMonthFilter, setSelectedMonthFilter] = useState<string>("all");

  useEffect(() => {
    loadReportsData();
  }, []);

  async function loadReportsData() {
    setLoading(true);
    setError("");
    setSuccessMessage("");
    try {
      const [tRes, eRes, cRes, bRes] = await Promise.all([
        fetch("/api/transactions"),
        fetch("/api/extra-items"),
        fetch("/api/customers"),
        fetch("/api/bills")
      ]);

      if (!tRes.ok || !eRes.ok || !cRes.ok || !bRes.ok) {
        throw new Error("Failed to load reports data.");
      }

      const tData = await tRes.json();
      const eData = await eRes.json();
      const cData = await cRes.json();
      const bData = await bRes.json();

      setTransactions(tData);
      setExtraItems(eData);
      setCustomers(cData);
      setBills(bData);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load reports.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveBill(cust: ICustomer, monthKey: string) {
    if (savingBill) return;
    setSavingBill(true);
    setSuccessMessage("");
    setError("");
    try {
      const openingBalance = Number(cust.openingBalance || 0);
      const deliveriesTotal = getSelectedMonthTotal(cust);
      const totalAmount = openingBalance + deliveriesTotal;

      const res = await fetch("/api/bills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: Number(cust._id),
          billingMonth: monthKey,
          openingBalance,
          deliveriesTotal,
          totalAmount,
          paidAmount: 0,
          status: "Unpaid"
        })
      });

      if (!res.ok) {
        throw new Error("Failed to save bill to database.");
      }

      setSuccessMessage("Bill successfully saved to database!");
      // Reload saved bills list
      const bRes = await fetch("/api/bills");
      if (bRes.ok) {
        const bData = await bRes.json();
        setBills(bData);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to save bill.");
    } finally {
      setSavingBill(false);
    }
  }



  // Generate the last 12 months going backward from today
  const getLast12Months = (): MonthCol[] => {
    const list: MonthCol[] = [];
    const today = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const key = `${year}-${month}`;
      const name = d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
      list.push({ key, name });
    }
    return list;
  };

  const activeMonths = getLast12Months(); // Latest month is index 0

  // Pre-calculate sales by customer and month
  // Key: `${customerId}_${monthKey}`
  const salesMap: Record<string, number> = {};
  // Pre-calculate all-time sales per customer
  const customerTotalMap: Record<string, number> = {};

  transactions.forEach((tx) => {
    const monthKey = tx.date.substring(0, 7); // YYYY-MM
    const custIdStr = tx.customerId.toString();
    
    const cellKey = `${custIdStr}_${monthKey}`;
    salesMap[cellKey] = (salesMap[cellKey] || 0) + tx.totalPrice;
    customerTotalMap[custIdStr] = (customerTotalMap[custIdStr] || 0) + tx.totalPrice;
  });

  extraItems.forEach((ei) => {
    const monthKey = ei.date.substring(0, 7); // YYYY-MM
    const custIdStr = ei.customerId.toString();

    const cellKey = `${custIdStr}_${monthKey}`;
    salesMap[cellKey] = (salesMap[cellKey] || 0) + ei.totalPrice;
    customerTotalMap[custIdStr] = (customerTotalMap[custIdStr] || 0) + ei.totalPrice;
  });





  interface DetailedDayRow {
    date: string; // YYYY-MM-DD
    defaultItem?: {
      name: string;
      morningQty: number;
      eveningQty: number;
      price: number;
      rate: number;
    };
    extraItems: {
      name: string;
      qty: number;
      price: number;
    }[];
    dayTotal: number;
  }

  interface MonthlyGroup {
    monthKey: string; // YYYY-MM
    monthName: string; // e.g. "June 2026"
    rows: DetailedDayRow[];
    monthTotal: number;
  }

  const getDetailedCustomerLedger = (cust: ICustomer): MonthlyGroup[] => {
    const dayMap: Record<string, DetailedDayRow> = {};

    const custTx = transactions.filter((tx) => tx.customerId.toString() === cust._id);
    const custEi = extraItems.filter((ei) => ei.customerId.toString() === cust._id);

    custTx.forEach((tx) => {
      const dateStr = tx.date;
      if (!dayMap[dateStr]) {
        dayMap[dateStr] = {
          date: dateStr,
          extraItems: [],
          dayTotal: 0,
        };
      }
      dayMap[dateStr].defaultItem = {
        name: tx.itemName || "Default Product",
        morningQty: Number(tx.morningQuantity || 0),
        eveningQty: Number(tx.eveningQuantity || 0),
        price: Number(tx.totalPrice || 0),
        rate: Number(tx.pricePerUnit || tx.itemPrice || 0),
      };
      dayMap[dateStr].dayTotal += Number(tx.totalPrice || 0);
    });

    custEi.forEach((ei) => {
      const dateStr = ei.date;
      if (!dayMap[dateStr]) {
        dayMap[dateStr] = {
          date: dateStr,
          extraItems: [],
          dayTotal: 0,
        };
      }
      dayMap[dateStr].extraItems.push({
        name: ei.itemName || "Extra Product",
        qty: Number(ei.quantity || 0),
        price: Number(ei.totalPrice || 0),
      });
      dayMap[dateStr].dayTotal += Number(ei.totalPrice || 0);
    });

    const sortedDays = Object.values(dayMap).sort((a, b) => b.date.localeCompare(a.date));
    const monthGroupsMap: Record<string, MonthlyGroup> = {};

    sortedDays.forEach((day) => {
      const monthKey = day.date.substring(0, 7); // YYYY-MM
      if (!monthGroupsMap[monthKey]) {
        const [year, month] = monthKey.split("-");
        const d = new Date(parseInt(year), parseInt(month) - 1, 1);
        const monthName = d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
        monthGroupsMap[monthKey] = {
          monthKey,
          monthName,
          rows: [],
          monthTotal: 0,
        };
      }
      monthGroupsMap[monthKey].rows.push(day);
      monthGroupsMap[monthKey].monthTotal += day.dayTotal;
    });

    const allGroups = Object.values(monthGroupsMap).sort((a, b) => b.monthKey.localeCompare(a.monthKey));
    if (selectedMonthFilter === "all") {
      return allGroups;
    }
    return allGroups.filter((g) => g.monthKey === selectedMonthFilter);
  };

  const getCustomerActiveMonths = (cust: ICustomer): MonthCol[] => {
    const monthsSet = new Set<string>();
    const custTx = transactions.filter((tx) => tx.customerId.toString() === cust._id);
    const custEi = extraItems.filter((ei) => ei.customerId.toString() === cust._id);

    custTx.forEach((tx) => monthsSet.add(tx.date.substring(0, 7)));
    custEi.forEach((ei) => monthsSet.add(ei.date.substring(0, 7)));

    const sortedMonths = Array.from(monthsSet).sort((a, b) => b.localeCompare(a));
    return sortedMonths.map((monthKey) => {
      const [year, month] = monthKey.split("-");
      const d = new Date(parseInt(year), parseInt(month) - 1, 1);
      const name = d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
      return { key: monthKey, name };
    });
  };

  const getSelectedMonthTotal = (cust: ICustomer): number => {
    const custTx = transactions.filter((tx) => tx.customerId.toString() === cust._id);
    const custEi = extraItems.filter((ei) => ei.customerId.toString() === cust._id);
    
    let total = 0;
    custTx.forEach((tx) => {
      if (selectedMonthFilter === "all" || tx.date.substring(0, 7) === selectedMonthFilter) {
        total += tx.totalPrice;
      }
    });
    custEi.forEach((ei) => {
      if (selectedMonthFilter === "all" || ei.date.substring(0, 7) === selectedMonthFilter) {
        total += ei.totalPrice;
      }
    });
    return total;
  };

  const getSelectedMonthDefaultTotal = (cust: ICustomer): number => {
    const custTx = transactions.filter((tx) => tx.customerId.toString() === cust._id);
    let total = 0;
    custTx.forEach((tx) => {
      if (selectedMonthFilter === "all" || tx.date.substring(0, 7) === selectedMonthFilter) {
        total += tx.totalPrice;
      }
    });
    return total;
  };

  const getSelectedMonthExtraTotal = (cust: ICustomer): number => {
    const custEi = extraItems.filter((ei) => ei.customerId.toString() === cust._id);
    let total = 0;
    custEi.forEach((ei) => {
      if (selectedMonthFilter === "all" || ei.date.substring(0, 7) === selectedMonthFilter) {
        total += ei.totalPrice;
      }
    });
    return total;
  };

  const getSelectedMonthName = (monthKey: string): string => {
    if (monthKey === "all") return "All Months";
    const [year, month] = monthKey.split("-");
    const d = new Date(parseInt(year), parseInt(month) - 1, 1);
    return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  };


  return (
    <div className="max-w-7xl mx-auto space-y-8 text-black pb-12">
      {/* Header */}
      <div className="no-print">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
          Customer Monthly Billings
        </h1>
        <p className="text-xs text-slate-500 font-semibold mt-1">
          Complete matrix of all registered clients and their monthly billing statements.
        </p>
      </div>

      {/* Alert Notifications */}
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center justify-between no-print">
          <span>{successMessage}</span>
          <button onClick={() => setSuccessMessage("")} className="text-emerald-500 hover:text-emerald-700 cursor-pointer font-bold">Dismiss</button>
        </div>
      )}
      {error && !loading && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs font-bold flex items-center justify-between no-print">
          <span>{error}</span>
          <button onClick={() => setError("")} className="text-rose-500 hover:text-rose-700 cursor-pointer font-bold">Dismiss</button>
        </div>
      )}

      {loading ? (
        <div className="p-20 text-center text-slate-455 text-xs font-semibold flex flex-col items-center justify-center gap-2">
          <svg className="w-7 h-7 animate-spin text-slate-350" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
          </svg>
          Compiling monthly customer billings...
        </div>
      ) : error ? (
        <div className="p-6 bg-rose-50 border border-rose-150 text-rose-800 rounded-2xl text-xs font-bold text-center">
          {error}
        </div>
      ) : (
        <>
          {/* Top Dropdown Selection Bar */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-5 no-print">
            <div className="space-y-1.5">
              <label className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">
                Select Customer
              </label>
              <select
                value={activeCustomer?._id || ""}
                onChange={(e) => {
                  const custId = e.target.value;
                  const found = customers.find((c) => c._id === custId);
                  setActiveCustomer(found || null);
                  setSelectedMonthFilter("all");
                }}
                className="w-full bg-slate-50 border border-slate-200 text-slate-950 font-bold text-xs rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm transition cursor-pointer"
              >
                <option value="">-- Choose Customer --</option>
                {customers.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name} ({c.phone})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">
                Select Month
              </label>
              <select
                value={selectedMonthFilter}
                disabled={!activeCustomer}
                onChange={(e) => setSelectedMonthFilter(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-950 font-bold text-xs rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <option value="all">All Months</option>
                {activeCustomer && getCustomerActiveMonths(activeCustomer).map((m) => (
                  <option key={m.key} value={m.key}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Detailed Ledger Section (rendered on page) */}
          {activeCustomer ? (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden p-6 mt-8 space-y-6 w-full max-w-full no-print">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">
                    {activeCustomer.name}'s Billings
                    {selectedMonthFilter !== "all" && (
                      <span className="text-blue-600 font-bold ml-1.5">
                        ({getSelectedMonthName(selectedMonthFilter)})
                      </span>
                    )}
                  </h3>
                </div>
              </div>

              {/* Day-by-Day Monthly Tables */}
              <div className="space-y-8">
                {getDetailedCustomerLedger(activeCustomer).length === 0 ? (
                  <p className="text-center text-slate-400 italic py-6">No delivery history found for this customer.</p>
                ) : (
                  getDetailedCustomerLedger(activeCustomer).map((group, gIdx) => (
                    <div key={gIdx} className="space-y-3">
                      

                      {/* Date-wise Details Table */}
                      <div className="overflow-x-auto border border-slate-200/80 rounded-2xl bg-white w-full">
                        <table className="w-full text-left border-collapse table-auto min-w-[900px]">
                          <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-200 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                              <th className="py-3 px-4">Date</th>
                              <th className="py-3 px-4">Allocated Product</th>
                              <th className="py-3 px-4 text-center">Morning Qty</th>
                              <th className="py-3 px-4 text-center">Evening Qty</th>
                              <th className="py-3 px-4">Extra Product</th>
                              <th className="py-3 px-4 text-center">Extra Qty</th>
                              <th className="py-3 px-4 text-right">Extra Price</th>
                              <th className="py-3 px-4 text-right">Subtotal</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-755">
                            {group.rows.map((dayRow, idx) => (
                              <tr key={idx} className="hover:bg-slate-50/20 transition duration-75">
                                <td className="py-3 px-4 text-slate-900 font-bold">{dayRow.date}</td>
                                <td className="py-3 px-4 text-slate-800 font-medium">{dayRow.defaultItem ? dayRow.defaultItem.name : "-"}</td>
                                <td className="py-3 px-4 text-center text-slate-500">
                                  {dayRow.defaultItem && dayRow.defaultItem.morningQty > 0 ? dayRow.defaultItem.morningQty : "-"}
                                </td>
                                <td className="py-3 px-4 text-center text-slate-500">
                                  {dayRow.defaultItem && dayRow.defaultItem.eveningQty > 0 ? dayRow.defaultItem.eveningQty : "-"}
                                </td>
                                <td className="py-3 px-4 text-slate-800 font-medium">
                                  {dayRow.extraItems && dayRow.extraItems.length > 0 ? (
                                    <div className="space-y-1">
                                      {dayRow.extraItems.map((item, idx) => (
                                        <div key={idx}>{item.name}</div>
                                      ))}
                                    </div>
                                  ) : "-"}
                                </td>
                                <td className="py-3 px-4 text-center text-slate-500">
                                  {dayRow.extraItems && dayRow.extraItems.length > 0 ? (
                                    <div className="space-y-1">
                                      {dayRow.extraItems.map((item, idx) => (
                                        <div key={idx}>{item.qty > 0 ? item.qty : "-"}</div>
                                      ))}
                                    </div>
                                  ) : "-"}
                                </td>
                                <td className="py-3 px-4 text-right text-slate-600">
                                  {dayRow.extraItems && dayRow.extraItems.length > 0 ? (
                                    <div className="space-y-1">
                                      {dayRow.extraItems.map((item, idx) => (
                                        <div key={idx}>₹{item.price.toFixed(2)}</div>
                                      ))}
                                    </div>
                                  ) : "-"}
                                </td>
                                <td className="py-3 px-4 text-right font-black text-slate-900 bg-slate-50/10">
                                  ₹{dayRow.dayTotal.toFixed(2)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Default Allocations Calculation Details */}
                      {(() => {
                        const defaultRows = group.rows.filter(r => r.defaultItem);
                        const totalMorning = defaultRows.reduce((sum, r) => sum + (r.defaultItem?.morningQty || 0), 0);
                        const totalEvening = defaultRows.reduce((sum, r) => sum + (r.defaultItem?.eveningQty || 0), 0);
                        const totalQty = totalMorning + totalEvening;
                        const rate = defaultRows.find(r => r.defaultItem)?.defaultItem?.rate || activeCustomer.itemPrice || 0;
                        const defaultTotalBill = totalQty * rate;

                        if (totalQty === 0) return null;

                        return (
                          <div className="p-4 bg-slate-50/60 border border-slate-200/80 rounded-2xl grid grid-cols-2 sm:grid-cols-5 gap-4 text-xs font-bold text-slate-700 mt-4 shadow-sm">
                            <div>
                              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Total Morning Qty</span>
                              <span className="text-sm font-extrabold text-slate-900">{totalMorning} {activeCustomer.itemUnit || 'L'}</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Total Evening Qty</span>
                              <span className="text-sm font-extrabold text-slate-900">{totalEvening} {activeCustomer.itemUnit || 'L'}</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Rate (Per Unit)</span>
                              <span className="text-sm font-extrabold text-slate-900">₹{rate.toFixed(2)} / {activeCustomer.itemUnit || 'L'}</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Total Default Bill</span>
                              <span className="text-sm font-extrabold text-blue-600">
                                ₹{defaultTotalBill.toFixed(2)}
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Total Extra Items Bill</span>
                              <span className="text-sm font-extrabold text-amber-600">
                                ₹{group.rows.reduce((sum, r) => sum + r.extraItems.reduce((s, item) => s + (item.price || 0), 0), 0).toFixed(2)}
                              </span>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  ))
                )}
              </div>

              {/* Financial Balance Summary Banner */}
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200/80 mt-4 max-w-md ml-auto">
                <h4 className="font-extrabold text-[10px] text-slate-400 uppercase tracking-wider mb-4">Invoice Summary Breakdown</h4>
                <div className="space-y-2 text-xs font-bold text-slate-700">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Total Default Bill:</span>
                    <span className="text-slate-900">₹{getSelectedMonthDefaultTotal(activeCustomer).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Total Extra Item Bill:</span>
                    <span className="text-slate-900">₹{getSelectedMonthExtraTotal(activeCustomer).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                    <span className="text-slate-500">Opening Balance:</span>
                    <span className="text-slate-900">₹{Number(activeCustomer.openingBalance || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 text-sm font-black bg-blue-50/50 p-2.5 rounded-xl text-blue-600">
                    <span>Total Monthly Spent:</span>
                    <span>
                      ₹{(
                        getSelectedMonthDefaultTotal(activeCustomer) +
                        getSelectedMonthExtraTotal(activeCustomer) +
                        Number(activeCustomer.openingBalance || 0)
                      ).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Lock & Save / Print / Edit Ledger Buttons */}
              <div className="flex flex-wrap items-center justify-end gap-3 mt-6 no-print">
                {(() => {
                  const savedBill = selectedMonthFilter !== "all"
                    ? bills.find(
                        (b) =>
                          b.customerId.toString() === activeCustomer._id &&
                          b.billingMonth === selectedMonthFilter
                      )
                    : null;

                  const currentDeliveriesTotal = getSelectedMonthTotal(activeCustomer);
                  const isSaved = savedBill && Math.abs(savedBill.deliveriesTotal - currentDeliveriesTotal) < 0.01;

                  return (
                    <>
                      <Link
                        href={`/admin/ledger?customerId=${activeCustomer._id}${selectedMonthFilter !== "all" ? `&month=${selectedMonthFilter}` : ""}`}
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl shadow-md transition bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Edit Ledger
                      </Link>
                      <button
                        onClick={() => handleSaveBill(activeCustomer, selectedMonthFilter)}
                        disabled={savingBill || isSaved || selectedMonthFilter === "all"}
                        className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl shadow-md transition ${
                          isSaved
                            ? "bg-emerald-100 text-emerald-800 cursor-not-allowed border border-emerald-200/50"
                            : selectedMonthFilter === "all"
                            ? "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200/50"
                            : "bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                        }`}
                        title={
                          selectedMonthFilter === "all"
                            ? "Cannot lock multiple months as a single bill record. Select a specific month first."
                            : isSaved
                            ? "This monthly bill is already locked and saved in the database"
                            : savedBill
                            ? "Updates have been made to the ledger. Click to update and re-lock this bill record."
                            : "Lock and save this bill record to the database"
                        }
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                        </svg>
                        {isSaved ? "Locked & Saved" : savingBill ? "Locking..." : savedBill ? "Update Locked Bill" : "Lock and save to database"}
                      </button>
                      
                      <button
                        onClick={() => setSelectedCustomerForReceipt(activeCustomer)}
                        disabled={!savedBill}
                        className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl shadow-md transition ${
                          !savedBill
                            ? "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200/50"
                            : "bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
                        }`}
                        title={
                          !savedBill
                            ? "You must lock and save this monthly bill to the database before viewing the receipt preview"
                            : "Open receipt preview for printing"
                        }
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                        </svg>
                        Print Preview
                      </button>

                      
                    </>
                  );
                })()}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-16 text-center text-slate-400 text-xs font-bold no-print">
              Please select a customer from the dropdown menu above to view and manage their monthly billings.
            </div>
          )}
        </>
      )}

      {/* Receipt Print Modal */}
      {selectedCustomerForReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm modal-print-overlay">
          <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-extrabold text-slate-900 text-sm">Receipt Preview</h3>
              <div className="flex items-center gap-2 no-print">
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  Print
                </button>
                <button
                  onClick={() => setSelectedCustomerForReceipt(null)}
                  className="p-1.5 hover:bg-slate-200 text-slate-500 hover:text-slate-800 rounded-xl transition"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            {/* Modal Body / Scrollable Receipt Area */}
            <div className="p-6 overflow-y-auto bg-slate-50/50 flex-1">
              <div id="printable-receipt-area" className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm text-slate-800 font-sans w-full mx-auto">
                {/* Receipt Header */}
                <div className="text-center pb-4 border-b border-dashed border-slate-200">
                  <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">Dairy Ledger Statement</h2>
                  <p className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider mt-0.5">Dairy Flow Pro • Invoice</p>
                  <div className="mt-2 text-[10px] text-slate-500 font-semibold flex justify-center gap-6 flex-wrap">
                    <span>Billing Period: {getSelectedMonthName(selectedMonthFilter)}</span>
                    <span>Date: {new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</span>
                    <span>Receipt ID: DL-{new Date().getFullYear()}{String(new Date().getMonth() + 1).padStart(2, "0")}-{selectedCustomerForReceipt._id.substring(0, 6)}</span>
                  </div>
                </div>

                {/* Customer Details Inline Layout */}
                <div className="py-3 border-b border-dashed border-slate-200 text-xs grid grid-cols-2 md:grid-cols-4 gap-4 text-slate-700">
                  <div>
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Customer Name</span>
                    <span className="text-xs font-bold text-slate-900">{selectedCustomerForReceipt.name}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Phone Number</span>
                    <span className="text-xs font-bold text-slate-900">{selectedCustomerForReceipt.phone}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Delivery Address</span>
                    <span className="text-xs font-bold text-slate-900">{selectedCustomerForReceipt.address}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Opening Balance</span>
                    <span className="text-xs font-bold text-slate-900">₹{Number(selectedCustomerForReceipt.openingBalance || 0).toFixed(2)}</span>
                  </div>
                </div>

                {/* Billing Summary Table */}
                <div className="py-4 text-xs">
                  {getDetailedCustomerLedger(selectedCustomerForReceipt).length === 0 ? (
                    <p className="text-center text-slate-400 italic py-6">No delivery history found for this customer.</p>
                  ) : (
                    getDetailedCustomerLedger(selectedCustomerForReceipt).map((group, gIdx) => (
                      <div key={gIdx} className="mb-4 last:mb-0">
                        {/* Table */}
                        <div className="overflow-x-auto border border-slate-150 rounded-xl">
                          <table className="w-full text-left border-collapse table-auto min-w-[800px]">
                            <thead>
                              <tr className="border-b border-slate-250 text-slate-500 font-bold bg-slate-50/50 text-[10px] uppercase tracking-wider">
                                <th className="py-2.5 px-3">Date</th>
                                <th className="py-2.5 px-3">Allocated Product</th>
                                <th className="py-2.5 px-3 text-center">Morning Qty</th>
                                <th className="py-2.5 px-3 text-center">Evening Qty</th>
                                
                                <th className="py-2.5 px-3">Extra Product</th>
                                <th className="py-2.5 px-3 text-center">Extra Qty</th>
                                <th className="py-2.5 px-3 text-right">Extra Price</th>
                                <th className="py-2.5 px-3 text-right">Subtotal</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {group.rows.map((dayRow, idx) => (
                                <tr key={idx} className="text-slate-700 font-semibold hover:bg-slate-50/20 text-xs">
                                  <td className="py-2.5 px-3 text-slate-900 font-bold whitespace-nowrap">
                                    {dayRow.date}
                                  </td>
                                  <td className="py-2.5 px-3 text-slate-800 font-medium">
                                    {dayRow.defaultItem ? dayRow.defaultItem.name : "-"}
                                  </td>
                                  <td className="py-2.5 px-3 text-center text-slate-600">
                                    {dayRow.defaultItem && dayRow.defaultItem.morningQty > 0 ? `${dayRow.defaultItem.morningQty}` : "-"}
                                  </td>
                                  <td className="py-2.5 px-3 text-center text-slate-600">
                                    {dayRow.defaultItem && dayRow.defaultItem.eveningQty > 0 ? `${dayRow.defaultItem.eveningQty}` : "-"}
                                  </td>
                                  
                                  <td className="py-2.5 px-3 text-slate-800 font-medium">
                                    {dayRow.extraItems && dayRow.extraItems.length > 0 ? (
                                      <div className="space-y-1">
                                        {dayRow.extraItems.map((item, idx) => (
                                          <div key={idx}>{item.name}</div>
                                        ))}
                                      </div>
                                    ) : "-"}
                                  </td>
                                  <td className="py-2.5 px-3 text-center text-slate-600">
                                    {dayRow.extraItems && dayRow.extraItems.length > 0 ? (
                                      <div className="space-y-1">
                                        {dayRow.extraItems.map((item, idx) => (
                                          <div key={idx}>{item.qty > 0 ? `${item.qty}` : "-"}</div>
                                        ))}
                                      </div>
                                    ) : "-"}
                                  </td>
                                  <td className="py-2.5 px-3 text-right text-slate-600">
                                    {dayRow.extraItems && dayRow.extraItems.length > 0 ? (
                                      <div className="space-y-1">
                                        {dayRow.extraItems.map((item, idx) => (
                                          <div key={idx}>₹{item.price.toFixed(2)}</div>
                                        ))}
                                      </div>
                                    ) : "-"}
                                  </td>
                                  <td className="py-2.5 px-3 text-right font-black text-slate-900">
                                    ₹{dayRow.dayTotal.toFixed(2)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Default Allocations Calculation Details */}
                        {(() => {
                          const defaultRows = group.rows.filter(r => r.defaultItem);
                          const totalMorning = defaultRows.reduce((sum, r) => sum + (r.defaultItem?.morningQty || 0), 0);
                          const totalEvening = defaultRows.reduce((sum, r) => sum + (r.defaultItem?.eveningQty || 0), 0);
                          const totalQty = totalMorning + totalEvening;
                          const rate = defaultRows.find(r => r.defaultItem)?.defaultItem?.rate || selectedCustomerForReceipt.itemPrice || 0;
                          const defaultTotalBill = totalQty * rate;

                          if (totalQty === 0) return null;

                          return (
                            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-2 sm:grid-cols-5 gap-4 text-[10px] font-bold text-slate-700 mt-3 print-summary-card">
                              <div>
                                <span className="text-[8px] text-slate-400 uppercase tracking-wider block">Total Morning Qty</span>
                                <span className="text-slate-900 font-extrabold">{totalMorning} {selectedCustomerForReceipt.itemUnit || 'L'}</span>
                              </div>
                              <div>
                                <span className="text-[8px] text-slate-400 uppercase tracking-wider block">Total Evening Qty</span>
                                <span className="text-slate-900 font-extrabold">{totalEvening} {selectedCustomerForReceipt.itemUnit || 'L'}</span>
                              </div>
                              <div>
                                <span className="text-[8px] text-slate-400 uppercase tracking-wider block">Rate (Per Unit)</span>
                                <span className="text-slate-900 font-extrabold">₹{rate.toFixed(2)} / {selectedCustomerForReceipt.itemUnit || 'L'}</span>
                              </div>
                              <div>
                                <span className="text-[8px] text-slate-400 uppercase tracking-wider block">Total Default Bill</span>
                                <span className="text-blue-600 font-black font-mono">
                                  ₹{defaultTotalBill.toFixed(2)}
                                </span>
                              </div>
                              <div>
                                <span className="text-[8px] text-slate-400 uppercase tracking-wider block">Total Extra Items Bill</span>
                                <span className="text-amber-600 font-black font-mono">
                                  ₹{group.rows.reduce((sum, r) => sum + r.extraItems.reduce((s, item) => s + (item.price || 0), 0), 0).toFixed(2)}
                                </span>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    ))
                  )}
                </div>

                {/* Financial Summary */}
                <div className="py-4 border-t border-dashed border-slate-200 text-xs">
                  <table className="w-full text-left">
                    <tbody>
                      <tr>
                        <td className="py-0.5 text-slate-500 font-semibold">Opening Balance:</td>
                        <td className="py-0.5 text-slate-900 font-bold text-right">
                          ₹{Number(selectedCustomerForReceipt.openingBalance || 0).toFixed(2)}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-0.5 text-slate-500 font-semibold">Total Deliveries:</td>
                        <td className="py-0.5 text-slate-900 font-bold text-right">
                          ₹{getSelectedMonthTotal(selectedCustomerForReceipt).toFixed(2)}
                        </td>
                      </tr>
                      <tr className="border-t border-slate-200">
                        <td className="py-2 text-slate-900 font-extrabold text-sm uppercase tracking-tight">Net Amount Due:</td>
                        <td className="py-2 text-slate-900 font-black text-right text-sm">
                          ₹{(
                            Number(selectedCustomerForReceipt.openingBalance || 0) +
                            getSelectedMonthTotal(selectedCustomerForReceipt)
                          ).toFixed(2)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Global CSS for Printing */}
      <style>{`
        @media print {
          @page {
            margin: 0 !important;
          }
          body {
            margin: 1.5cm !important;
            background: white !important;
            color: black !important;
          }
          /* Hide sidebar navigation, top header, page footer, and other layout containers */
          aside, header, footer, .no-print {
            display: none !important;
          }
          /* Reset root layout style constraints */
          body, html, main, div {
            background: white !important;
            color: black !important;
            box-shadow: none !important;
            border: none !important;
            overflow: visible !important;
          }
          /* Override modal fixed overlay styles to stretch to A4 canvas flow */
          .modal-print-overlay {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            height: auto !important;
            background: white !important;
            padding: 0 !important;
            margin: 0 !important;
            display: block !important;
            z-index: auto !important;
            box-shadow: none !important;
            backdrop-filter: none !important;
          }
          .modal-print-overlay > div {
            max-width: 100% !important;
            width: 100% !important;
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
            padding: 0 !important;
            max-height: none !important;
            background: white !important;
          }
          /* Hide preview modal top toolbar containing Print/Close buttons */
          .modal-print-overlay > div > div:first-child {
            display: none !important;
          }
          /* Ensure the receipt scrolls properly and fits print canvas */
          .overflow-y-auto {
            overflow: visible !important;
            background: white !important;
            padding: 0 !important;
          }
          #printable-receipt-area {
            border: none !important;
            box-shadow: none !important;
            padding: 15px !important;
            max-width: 100% !important;
            width: 100% !important;
            margin: 0 auto !important;
            background: white !important;
            font-size: 10px !important;
          }
          #printable-receipt-area table th,
          #printable-receipt-area table td {
            padding: 4px 6px !important;
            font-size: 9px !important;
          }
          #printable-receipt-area h2 {
            font-size: 16px !important;
          }
          .print-summary-card {
            margin-top: 8px !important;
            padding: 8px !important;
            gap: 8px !important;
          }
          .print-summary-card span {
            font-size: 8px !important;
          }
        }
      `}</style>
    </div>
  );
}
