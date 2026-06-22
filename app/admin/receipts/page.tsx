"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { IBill, ICustomer, ITransaction, IExtraItem } from "@/types";

interface MonthCol {
  key: string; // YYYY-MM
  name: string; // e.g. "Jun 2026"
}

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

function ReceiptsContent() {
  const searchParams = useSearchParams();
  const customerIdParam = searchParams.get("customerId");
  const monthParam = searchParams.get("month");

  // Global State
  const [bills, setBills] = useState<IBill[]>([]);
  const [customers, setCustomers] = useState<ICustomer[]>([]);
  const [transactions, setTransactions] = useState<ITransaction[]>([]);
  const [extraItems, setExtraItems] = useState<IExtraItem[]>([]);
  
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [successMessage, setSuccessMessage] = useState<string>("");

  // --- Form States (Left Column) ---
  const [formCustomerId, setFormCustomerId] = useState<string>("");
  const [paymentDate, setPaymentDate] = useState<string>("");
  const [formBillId, setFormBillId] = useState<string>("");
  const [amountReceived, setAmountReceived] = useState<string>("0.00");

  // --- Preview State (Right Column) ---
  const [activePreviewBillId, setActivePreviewBillId] = useState<string | null>(null);
  const [showDetailedLedger, setShowDetailedLedger] = useState<boolean>(false);

  // --- Archive Table Filters (Bottom Section) ---
  const [filterCustomerId, setFilterCustomerId] = useState<string>("all");
  const [filterMonth, setFilterMonth] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  // Initialize date helper
  const getTodayDateString = (): string => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  useEffect(() => {
    setPaymentDate(getTodayDateString());
    loadData();
  }, []);

  // Handle query params from routing
  useEffect(() => {
    if (customerIdParam) {
      setFormCustomerId(customerIdParam);
    }
  }, [customerIdParam]);

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const [bRes, cRes, tRes, eRes] = await Promise.all([
        fetch("/api/bills"),
        fetch("/api/customers"),
        fetch("/api/transactions"),
        fetch("/api/extra-items"),
      ]);

      if (!bRes.ok || !cRes.ok || !tRes.ok || !eRes.ok) {
        throw new Error("Failed to load billing registry data.");
      }

      const bData = await bRes.json();
      const cData = await cRes.json();
      const tData = await tRes.json();
      const eData = await eRes.json();

      setBills(bData);
      setCustomers(cData);
      setTransactions(tData);
      setExtraItems(eData);

      // Pre-select first customer in dropdown if none set
      if (cData.length > 0 && !formCustomerId) {
        setFormCustomerId(cData[0]._id);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load receipts.");
    } finally {
      setLoading(false);
    }
  }

  // Auto-select pending bill when form customer changes
  useEffect(() => {
    if (formCustomerId && bills.length > 0) {
      const pendingBills = bills.filter(
        (b) => b.customerId.toString() === formCustomerId && b.status !== "Paid"
      );
      if (pendingBills.length > 0) {
        setFormBillId(pendingBills[0]._id || "");
      } else {
        // Fallback to latest bill if no pending
        const allCustBills = bills.filter((b) => b.customerId.toString() === formCustomerId);
        if (allCustBills.length > 0) {
          setFormBillId(allCustBills[0]._id || "");
        } else {
          setFormBillId("");
        }
      }
    }
  }, [formCustomerId, bills]);

  // Find active selected bill in form
  const selectedFormBill = bills.find((b) => b._id === formBillId);
  const outstandingAmount = selectedFormBill
    ? Math.max(0, selectedFormBill.totalAmount - Number(selectedFormBill.paidAmount || 0))
    : 0;

  // Auto-fill amount received when bill changes
  useEffect(() => {
    if (selectedFormBill) {
      const outstanding = Math.max(0, selectedFormBill.totalAmount - Number(selectedFormBill.paidAmount || 0));
      setAmountReceived(outstanding > 0 ? outstanding.toFixed(2) : "0.00");
    } else {
      setAmountReceived("0.00");
    }
  }, [formBillId]);

  // Handle payment receipt generation
  const handleGenerateReceipt = async () => {
    setError("");
    setSuccessMessage("");

    if (!formBillId) {
      setError("Please select a pending bill to apply payment.");
      return;
    }

    const val = Number(amountReceived);
    if (isNaN(val) || val <= 0) {
      setError("Please enter a valid payment amount greater than zero.");
      return;
    }

    if (!selectedFormBill) return;

    try {
      const currentPaid = Number(selectedFormBill.paidAmount || 0);
      const newPaid = currentPaid + val;
      const newStatus = newPaid >= selectedFormBill.totalAmount ? "Paid" : "Partially Paid";

      const res = await fetch(`/api/bills/${formBillId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paidAmount: newPaid,
          status: newStatus,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to record payment receipt.");
      }

      setSuccessMessage(`Successfully recorded payment of ₹${val.toFixed(2)} for ${selectedFormBill.customerName}!`);
      
      // Cache selected bill ID for preview
      const activeId = formBillId;

      // Reload dataset
      const bRes = await fetch("/api/bills");
      if (bRes.ok) {
        const bData = await bRes.json();
        setBills(bData);
      }

      // Display newly generated receipt on the right
      setActivePreviewBillId(activeId);
    } catch (err: any) {
      setError(err.message || "Failed to record payment.");
    }
  };

  // Handle Delete Bill
  async function handleDeleteBill(billId: string) {
    if (!window.confirm("Are you sure you want to permanently delete this locked bill?")) {
      return;
    }
    setError("");
    setSuccessMessage("");
    try {
      const res = await fetch(`/api/bills/${billId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Failed to delete bill.");
      }

      setSuccessMessage("Monthly bill deleted successfully.");
      if (activePreviewBillId === billId) {
        setActivePreviewBillId(null);
      }
      setBills(bills.filter((b) => b._id !== billId));
    } catch (err: any) {
      setError(err.message || "Failed to delete bill.");
    }
  }

  // Helpers for formatting
  const getAvailableMonths = (): MonthCol[] => {
    const monthsSet = new Set<string>();
    bills.forEach((b) => monthsSet.add(b.billingMonth));
    const sorted = Array.from(monthsSet).sort((a, b) => b.localeCompare(a));
    return sorted.map((m) => {
      const [year, month] = m.split("-");
      const d = new Date(parseInt(year), parseInt(month) - 1, 1);
      const name = d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
      return { key: m, name };
    });
  };

  const getSelectedMonthName = (monthKey: string): string => {
    if (monthKey === "all") return "All Months";
    const [year, month] = monthKey.split("-");
    const d = new Date(parseInt(year), parseInt(month) - 1, 1);
    return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  };

  // Archive list filtering logic
  const filteredBills = bills.filter((b) => {
    const matchCust = filterCustomerId === "all" || b.customerId.toString() === filterCustomerId;
    const matchMonth = filterMonth === "all" || b.billingMonth === filterMonth;
    const matchStatus = filterStatus === "all" || b.status.toLowerCase() === filterStatus.toLowerCase();
    return matchCust && matchMonth && matchStatus;
  });

  // Calculate detailed ledger breakdown for invoice card preview
  const getDetailedCustomerLedger = (cust: ICustomer, targetMonth: string): MonthlyGroup[] => {
    const dayMap: Record<string, DetailedDayRow> = {};

    const custTx = transactions.filter(
      (tx) => tx.customerId.toString() === cust._id && tx.date.substring(0, 7) === targetMonth
    );
    const custEi = extraItems.filter(
      (ei) => ei.customerId.toString() === cust._id && ei.date.substring(0, 7) === targetMonth
    );

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
    
    if (sortedDays.length === 0) return [];

    const [year, month] = targetMonth.split("-");
    const d = new Date(parseInt(year), parseInt(month) - 1, 1);
    const monthName = d.toLocaleDateString("en-US", { month: "long", year: "numeric" });

    const totalSpent = sortedDays.reduce((sum, r) => sum + r.dayTotal, 0);

    return [{
      monthKey: targetMonth,
      monthName,
      rows: sortedDays,
      monthTotal: totalSpent,
    }];
  };

  // Preview properties
  const previewBill = bills.find((b) => b._id === activePreviewBillId);
  const previewCustomer = previewBill
    ? customers.find((c) => c._id === previewBill.customerId.toString())
    : null;

  const handlePrint = () => {
    if (!previewCustomer || !previewBill) return;
    const originalTitle = document.title;
    const customerName = previewCustomer.name;
    const billingMonth = getSelectedMonthName(previewBill.billingMonth);
    document.title = `Dairy Ledger Statement of ${customerName} - ${billingMonth}`;
    window.print();
    document.title = originalTitle;
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 text-black pb-12">
      {/* 1. Header Banner */}
      <div className="bg-white/80 backdrop-blur-md border border-slate-200/50 rounded-3xl p-8 shadow-sm no-print">
        <h1 className="text-3xl font-black text-slate-800 tracking-tight">Payment Receipts</h1>
        <p className="text-slate-500 font-medium mt-1">
          Record customer payments and automatically update their balances.
        </p>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center justify-between no-print shadow-sm">
          <span>{successMessage}</span>
          <button onClick={() => setSuccessMessage("")} className="text-emerald-500 hover:text-emerald-700 cursor-pointer font-bold">Dismiss</button>
        </div>
      )}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs font-bold flex items-center justify-between no-print shadow-sm">
          <span>{error}</span>
          <button onClick={() => setError("")} className="text-rose-500 hover:text-rose-700 cursor-pointer font-bold">Dismiss</button>
        </div>
      )}

      {loading ? (
        <div className="p-20 text-center text-slate-400 text-xs font-semibold flex flex-col items-center justify-center gap-2 no-print">
          <svg className="w-7 h-7 animate-spin text-slate-350" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
          </svg>
          Loading billing registry...
        </div>
      ) : (
        <>
          {/* 2. Main Columns: Form on Left, Receipt Card Preview on Right */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Form Column (Left) */}
            <div className="lg:col-span-5 flex flex-col form-column no-print">
              <div className="bg-white border border-slate-200/80 rounded-3xl overflow-hidden shadow-sm flex flex-col h-full">
                
                {/* Blue/Navy Header Banner */}
                <div className="bg-[#1e293b] px-6 py-4 border-b border-slate-700/10">
                  <h3 className="text-sm font-black uppercase text-white tracking-wider">
                    New Receipt Entry
                  </h3>
                </div>

                <div className="p-6 space-y-6 flex-1 flex flex-col justify-between">
                  <div className="space-y-5">
                    {/* 1. Select Customer */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">
                        1. Select Customer
                      </label>
                      <select
                        value={formCustomerId}
                        onChange={(e) => setFormCustomerId(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 text-slate-900 font-bold text-xs rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 shadow-sm cursor-pointer"
                      >
                        {customers.map((c) => (
                          <option value={c._id} key={c._id}>
                            {c.name} {c.phone ? `(${c.phone})` : ""}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* 2. Payment Date */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">
                        2. Payment Date
                      </label>
                      <input
                        type="date"
                        value={paymentDate}
                        onChange={(e) => setPaymentDate(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 text-slate-900 font-bold text-xs rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 shadow-sm cursor-pointer"
                      />
                    </div>

                    {/* 3. Select Pending Bill */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">
                        3. Select Pending Bill
                      </label>
                      <select
                        value={formBillId}
                        onChange={(e) => setFormBillId(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 text-slate-900 font-bold text-xs rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 shadow-sm cursor-pointer"
                      >
                        {bills.filter(b => b.customerId.toString() === formCustomerId).length === 0 ? (
                          <option value="">No locked bills found</option>
                        ) : (
                          bills
                            .filter((b) => b.customerId.toString() === formCustomerId)
                            .map((b) => {
                              const pending = b.totalAmount - Number(b.paidAmount || 0);
                              return (
                                <option value={b._id} key={b._id}>
                                  {getSelectedMonthName(b.billingMonth)} Bill {pending > 0 ? `(₹${pending.toFixed(2)} due)` : "(Paid)"}
                                </option>
                              );
                            })
                        )}
                      </select>
                    </div>

                    {/* Output/Input Grid */}
                    <div className="grid grid-cols-2 gap-4 pt-2">
                      {/* Total Outstanding Card (Amber background) */}
                      <div className="bg-amber-50 border border-amber-200/50 rounded-2xl p-4 flex flex-col justify-center">
                        <span className="text-[9px] text-amber-600 font-extrabold uppercase tracking-wider block mb-1">
                          Total Outstanding
                        </span>
                        <span className="text-2xl font-black text-amber-800 tracking-tight font-mono">
                          ₹{outstandingAmount.toFixed(2)}
                        </span>
                      </div>

                      {/* Enter Amount Received input box (Green border) */}
                      <div className="flex flex-col justify-center">
                        <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider block mb-1">
                          Enter Amount Received
                        </span>
                        <div className="relative">
                          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500 font-black text-sm pointer-events-none">
                            ₹
                          </span>
                          <input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={amountReceived}
                            onChange={(e) => setAmountReceived(e.target.value)}
                            className="w-full pl-7 pr-3 py-3 bg-white border-2 border-emerald-400/80 focus:border-emerald-500 rounded-2xl text-lg font-black text-slate-900 focus:outline-none focus:ring-4 focus:ring-emerald-400/10 font-mono transition"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Mint Green CTA Button */}
                  <button
                    onClick={handleGenerateReceipt}
                    className="w-full mt-6 py-4 bg-[#74c6a6] hover:bg-[#63b595] text-white text-xs font-black uppercase tracking-wider rounded-2xl shadow-lg shadow-emerald-400/10 cursor-pointer transition transform active:scale-98 text-center"
                  >
                    Generate Receipt & Update Balance
                  </button>
                </div>

              </div>
            </div>

            {/* Receipt Preview Column (Right) */}
            <div className="lg:col-span-7">
              {!previewBill || !previewCustomer ? (
                <div className="h-full min-h-[480px] bg-slate-50/20 border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center p-8 text-center text-slate-400">
                  <svg className="w-12 h-12 text-slate-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-sm font-bold text-slate-500">
                    Receipt preview will appear here after saving.
                  </p>
                  <p className="text-xs text-slate-400 mt-1 max-w-xs">
                    Select a customer and locked bill to apply payments or select a record from history list.
                  </p>
                </div>
              ) : (
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col gap-6">
                  {/* Action Header */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 flex-wrap gap-2">
                    <div>
                      <h4 className="text-sm font-black text-slate-900">Receipt Invoice Statement</h4>
                      <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Real-time Print & Share layout</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowDetailedLedger(!showDetailedLedger)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
                      >
                        {showDetailedLedger ? "Hide Daily Ledger" : "Show Daily Ledger"}
                      </button>
                      <button
                        onClick={handlePrint}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl shadow-sm transition cursor-pointer"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                        </svg>
                        Print Statement
                      </button>
                    </div>
                  </div>

                  {/* Printable layout wrapper */}
                  <div id="printable-receipt-area" className="bg-white p-6 rounded-2xl border border-slate-150 shadow-inner text-slate-800 font-sans w-full mx-auto print-card">
                    {/* Header */}
                    <div className="text-center pb-4 border-b border-dashed border-slate-200">
                      <h2 className="text-base font-black text-slate-900 uppercase tracking-tight">
                        Dairy Ledger Statement of {previewCustomer.name}
                      </h2>
                      <p className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider mt-0.5">Dairy Flow Pro • Invoice</p>
                      <div className="mt-2 text-[10px] text-slate-500 font-semibold flex justify-center gap-6 flex-wrap">
                        <span>Billing Period: {getSelectedMonthName(previewBill.billingMonth)}</span>
                        <span>Date: {new Date(previewBill.createdAt || "").toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</span>
                        <span>Receipt ID: DL-{new Date(previewBill.createdAt || "").getFullYear()}{String(new Date(previewBill.createdAt || "").getMonth() + 1).padStart(2, "0")}-{previewBill._id?.substring(0, 6)}</span>
                      </div>
                    </div>

                    {/* Customer Info */}
                    <div className="py-3 border-b border-dashed border-slate-200 text-xs grid grid-cols-2 md:grid-cols-4 gap-4 text-slate-700">
                      <div>
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Customer Name</span>
                        <span className="text-xs font-bold text-slate-900">{previewCustomer.name}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Phone Number</span>
                        <span className="text-xs font-bold text-slate-900">{previewCustomer.phone || "N/A"}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Delivery Address</span>
                        <span className="text-xs font-bold text-slate-900">{previewCustomer.address || "N/A"}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Opening Balance</span>
                        <span className="text-xs font-bold text-slate-900">₹{Number(previewBill.openingBalance || 0).toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Ledger details list */}
                    <div className="py-4 text-xs">
                      {getDetailedCustomerLedger(previewCustomer, previewBill.billingMonth).length === 0 ? (
                        <p className="text-center text-slate-400 italic py-6">No delivery history records found for this month.</p>
                      ) : (
                        getDetailedCustomerLedger(previewCustomer, previewBill.billingMonth).map((group, gIdx) => (
                          <div key={gIdx} className="mb-4 last:mb-0">
                            {showDetailedLedger ? (
                              <div className="overflow-x-auto border border-slate-150 rounded-xl">
                                <table className="w-full text-left border-collapse table-auto min-w-[700px]">
                                  <thead>
                                    <tr className="border-b border-slate-200 text-slate-500 font-bold bg-slate-50/50 text-[10px] uppercase tracking-wider">
                                      <th className="py-2.5 px-3">Date</th>
                                      <th className="py-2.5 px-3">Allocated Product</th>
                                      <th className="py-2.5 px-3 text-center">Morning</th>
                                      <th className="py-2.5 px-3 text-center">Evening</th>
                                      <th className="py-2.5 px-3">Extra Product</th>
                                      <th className="py-2.5 px-3 text-center">Extra Qty</th>
                                      <th className="py-2.5 px-3 text-right">Subtotal</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {group.rows.map((dayRow, idx) => (
                                      <tr key={idx} className="text-slate-700 font-semibold hover:bg-slate-50/10 text-[11px]">
                                        <td className="py-2 px-3 text-slate-900 font-bold whitespace-nowrap">{dayRow.date}</td>
                                        <td className="py-2 px-3 text-slate-800 font-medium">{dayRow.defaultItem ? dayRow.defaultItem.name : "-"}</td>
                                        <td className="py-2 px-3 text-center text-slate-600">
                                          {dayRow.defaultItem && dayRow.defaultItem.morningQty > 0 ? `${dayRow.defaultItem.morningQty}` : "-"}
                                        </td>
                                        <td className="py-2 px-3 text-center text-slate-600">
                                          {dayRow.defaultItem && dayRow.defaultItem.eveningQty > 0 ? `${dayRow.defaultItem.eveningQty}` : "-"}
                                        </td>
                                        <td className="py-2 px-3 text-slate-850 font-medium">
                                          {dayRow.extraItems && dayRow.extraItems.length > 0 ? (
                                            <div className="space-y-1">
                                              {dayRow.extraItems.map((item, idx) => (
                                                <div key={idx}>{item.name}</div>
                                              ))}
                                            </div>
                                          ) : "-"}
                                        </td>
                                        <td className="py-2 px-3 text-center text-slate-600">
                                          {dayRow.extraItems && dayRow.extraItems.length > 0 ? (
                                            <div className="space-y-1">
                                              {dayRow.extraItems.map((item, idx) => (
                                                <div key={idx}>{item.qty}</div>
                                              ))}
                                            </div>
                                          ) : "-"}
                                        </td>
                                        <td className="py-2 px-3 text-right font-black text-slate-900">₹{dayRow.dayTotal.toFixed(2)}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            ) : (
                              <div className="text-center py-2 px-4 bg-slate-50/50 border border-slate-100 rounded-xl text-[10px] text-slate-400 font-medium no-print">
                                Daily delivery logs collapsed. Click &quot;Show Daily Ledger&quot; above to view daily details.
                              </div>
                            )}

                            {/* Details box inside preview */}
                            {(() => {
                              const defaultRows = group.rows.filter(r => r.defaultItem);
                              const totalMorning = defaultRows.reduce((sum, r) => sum + (r.defaultItem?.morningQty || 0), 0);
                              const totalEvening = defaultRows.reduce((sum, r) => sum + (r.defaultItem?.eveningQty || 0), 0);
                              const totalQty = totalMorning + totalEvening;
                              const rate = defaultRows.find(r => r.defaultItem)?.defaultItem?.rate || previewCustomer.itemPrice || 0;
                              const defaultTotalBill = totalQty * rate;

                              if (totalQty === 0) return null;

                              return (
                                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-2 sm:grid-cols-5 gap-3 text-[10px] font-bold text-slate-700 mt-3 print-summary-card">
                                  <div>
                                    <span className="text-[8px] text-slate-400 uppercase tracking-wider block">Total Morning</span>
                                    <span className="text-slate-900 font-extrabold">{totalMorning} {previewCustomer.itemUnit || 'L'}</span>
                                  </div>
                                  <div>
                                    <span className="text-[8px] text-slate-400 uppercase tracking-wider block">Total Evening</span>
                                    <span className="text-slate-900 font-extrabold">{totalEvening} {previewCustomer.itemUnit || 'L'}</span>
                                  </div>
                                  <div>
                                    <span className="text-[8px] text-slate-400 uppercase tracking-wider block">Rate (Per Unit)</span>
                                    <span className="text-slate-900 font-extrabold">₹{rate.toFixed(2)} / {previewCustomer.itemUnit || 'L'}</span>
                                  </div>
                                  <div>
                                    <span className="text-[8px] text-slate-400 uppercase tracking-wider block">Default Bill</span>
                                    <span className="text-blue-600 font-black font-mono">₹{defaultTotalBill.toFixed(2)}</span>
                                  </div>
                                  <div>
                                    <span className="text-[8px] text-slate-400 uppercase tracking-wider block">Extra Items</span>
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

                    {/* Financial summary calculations */}
                    <div className="py-4 border-t border-dashed border-slate-200 text-xs">
                      <div className="max-w-xs ml-auto">
                        <table className="w-full text-left">
                          <tbody>
                            <tr>
                              <td className="py-0.5 text-slate-500 font-semibold">Opening Balance:</td>
                              <td className="py-0.5 text-slate-900 font-bold text-right font-mono">
                                ₹{Number(previewBill.openingBalance || 0).toFixed(2)}
                              </td>
                            </tr>
                            <tr>
                              <td className="py-0.5 text-slate-500 font-semibold">Total Deliveries:</td>
                              <td className="py-0.5 text-slate-900 font-bold text-right font-mono">
                                ₹{previewBill.deliveriesTotal.toFixed(2)}
                              </td>
                            </tr>
                            <tr>
                              <td className="py-0.5 text-slate-500 font-semibold">Paid Amount:</td>
                              <td className="py-0.5 text-slate-900 font-bold text-right text-emerald-600 font-mono">
                                ₹{Number(previewBill.paidAmount || 0).toFixed(2)}
                              </td>
                            </tr>
                            <tr className="border-t border-slate-200">
                              <td className="py-2 text-slate-900 font-extrabold text-xs uppercase tracking-tight">Net Amount Due:</td>
                              <td className="py-2 text-slate-900 font-black text-right text-sm font-mono">
                                ₹{(previewBill.totalAmount - Number(previewBill.paidAmount || 0)).toFixed(2)}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                  </div>
                </div>
              )}
            </div>

          </div>

          {/* 3. Archive / Saved Invoices Table (Bottom Section) */}
          <div className="space-y-4 no-print bills-table-container">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-slate-800">Saved Billing Archive</h3>
                <p className="text-[10px] text-slate-400 font-semibold">Historical registry of all locked monthly bills</p>
              </div>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider block">Customer</label>
                <select
                  value={filterCustomerId}
                  onChange={(e) => setFilterCustomerId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 font-bold text-xs rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 shadow-sm cursor-pointer"
                >
                  <option value="all">All Customers</option>
                  {customers.map((c) => (
                    <option value={c._id} key={c._id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider block">Billing Month</label>
                <select
                  value={filterMonth}
                  onChange={(e) => setFilterMonth(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 font-bold text-xs rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 shadow-sm cursor-pointer"
                >
                  <option value="all">All Months</option>
                  {getAvailableMonths().map((m) => (
                    <option key={m.key} value={m.key}>{m.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider block">Status</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 font-bold text-xs rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 shadow-sm cursor-pointer"
                >
                  <option value="all">All Statuses</option>
                  <option value="Paid">Paid</option>
                  <option value="Unpaid">Unpaid</option>
                  <option value="Partially Paid">Partially Paid</option>
                </select>
              </div>
            </div>

            {/* Archive Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse table-auto">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-200 text-[9px] uppercase font-bold text-slate-500 tracking-wider">
                      <th className="py-3 px-5">Billing Period</th>
                      <th className="py-3 px-5">Customer Name</th>
                      <th className="py-3 px-5 text-right">Deliveries Spent</th>
                      <th className="py-3 px-5 text-right">Opening Balance</th>
                      <th className="py-3 px-5 text-right">Total Net</th>
                      <th className="py-3 px-5 text-right">Paid Amount</th>
                      <th className="py-3 px-5 text-center">Status</th>
                      <th className="py-3 px-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                    {filteredBills.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-16 text-center text-slate-400 font-bold italic">
                          No saved invoices matched your selected filters.
                        </td>
                      </tr>
                    ) : (
                      filteredBills.map((bill) => (
                        <tr key={bill._id} className="hover:bg-slate-50/30 transition">
                          <td className="py-4 px-5 text-slate-900 font-bold">
                            {getSelectedMonthName(bill.billingMonth)}
                          </td>
                          <td className="py-4 px-5 text-slate-800 font-bold">
                            {bill.customerName || "Unknown Customer"}
                          </td>
                          <td className="py-4 px-5 text-right text-slate-600 font-mono">
                            ₹{bill.deliveriesTotal.toFixed(2)}
                          </td>
                          <td className="py-4 px-5 text-right text-slate-400 font-mono">
                            ₹{bill.openingBalance.toFixed(2)}
                          </td>
                          <td className="py-4 px-5 text-right text-slate-900 font-black font-mono">
                            ₹{bill.totalAmount.toFixed(2)}
                          </td>
                          <td className="py-4 px-5 text-right text-slate-900 font-mono">
                            ₹{bill.paidAmount.toFixed(2)}
                          </td>
                          <td className="py-4 px-5 text-center">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                                bill.status === "Paid"
                                  ? "bg-green-50 text-green-700 border border-green-200/50"
                                  : bill.status === "Partially Paid"
                                  ? "bg-amber-50 text-amber-700 border border-amber-200/50"
                                  : "bg-rose-50 text-rose-700 border border-rose-200/50"
                              }`}
                            >
                              {bill.status}
                            </span>
                          </td>
                          <td className="py-4 px-5 text-right space-x-2">
                            <button
                              onClick={() => {
                                // Load this bill directly into the interactive preview panel
                                setActivePreviewBillId(bill._id!);
                                setFormCustomerId(bill.customerId.toString());
                                setFormBillId(bill._id!);
                              }}
                              className="text-emerald-600 hover:text-emerald-700 font-extrabold cursor-pointer transition text-xs bg-transparent border-0"
                            >
                              Load Preview
                            </button>
                            <button
                              onClick={() => handleDeleteBill(bill._id!)}
                              className="text-rose-600 hover:text-rose-700 font-extrabold cursor-pointer transition text-xs bg-transparent border-0"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Global CSS for Printing the statement directly from page */}
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
          /* Reset parent layout containers to allow standard page flow */
          html, body, main, .min-h-screen {
            height: auto !important;
            min-height: auto !important;
            overflow: visible !important;
            display: block !important;
            position: static !important;
            background: white !important;
            color: black !important;
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .lg\\:col-span-7 {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            display: block !important;
          }
          #printable-receipt-area {
            border: none !important;
            box-shadow: none !important;
            padding: 0px !important;
            max-width: 100% !important;
            width: 100% !important;
            margin: 0 auto !important;
            background: white !important;
            font-size: 11px !important;
            color: black !important;
          }
          #printable-receipt-area table {
            width: 100% !important;
            border-collapse: collapse !important;
          }
          #printable-receipt-area table th,
          #printable-receipt-area table td {
            padding: 6px 8px !important;
            font-size: 10px !important;
            border-bottom: 1px solid #e2e8f0 !important;
          }
          #printable-receipt-area h2 {
            font-size: 18px !important;
          }
          .print-card {
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            background: white !important;
          }
          .print-summary-card {
            display: grid !important;
            grid-template-cols: repeat(5, minmax(0, 1fr)) !important;
            margin-top: 12px !important;
            padding: 12px !important;
            gap: 12px !important;
            border: 1px solid #e2e8f0 !important;
            background: #f8fafc !important;
          }
          .print-summary-card span {
            font-size: 9px !important;
          }
          /* Hide all non-printable elements - Placed at the very bottom to guarantee precedence */
          aside, header, footer, .no-print, .form-column, .bills-table-container, button, [title="AI Copilot Chatbot"], .fixed {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}

export default function ReceiptsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400 font-bold">Loading payment receipts...</div>}>
      <ReceiptsContent />
    </Suspense>
  );
}
